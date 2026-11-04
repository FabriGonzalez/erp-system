package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.common.util.SearchText;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductImage;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.entity.ProductVariantAttribute;
import com.gonzalez.erp.modules.products.repository.ProductImageRepository;
import com.gonzalez.erp.modules.products.service.ImageStorage;
import com.gonzalez.erp.modules.store.dto.StoreAvailability;
import com.gonzalez.erp.modules.store.dto.StoreCategoryResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductSummaryResponse;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository.ProductRow;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository.VariantStock;
import com.gonzalez.erp.modules.store.web.CurrentStore;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoreCatalogServiceImpl implements StoreCatalogService {

    /** Con esta cantidad o menos la variante figura "últimas unidades". */
    static final int LOW_STOCK_THRESHOLD = 3;

    private final StoreCatalogRepository catalogRepository;
    private final ProductImageRepository imageRepository;
    private final CompanyRepository companyRepository;
    private final ImageStorage storage;

    @Override
    public List<StoreCategoryResponse> findCategories() {
        return catalogRepository.findVisibleCategories(CurrentStore.require().companyId()).stream()
                .map(category -> new StoreCategoryResponse(category.getId(), category.getName()))
                .toList();
    }

    @Override
    public PageResponse<StoreProductSummaryResponse> findProducts(Long categoryId, String search, Pageable pageable) {
        Company company = currentCompany();
        String normalized = SearchText.normalize(search);
        Page<ProductRow> page = catalogRepository.findVisibleProducts(
                company.getId(), categoryId, normalized != null, SearchText.containsPattern(normalized), pageable);

        List<Long> productIds = page.getContent().stream().map(ProductRow::getId).toList();
        if (productIds.isEmpty()) {
            return PageResponse.of(page, row -> null);
        }

        // Una consulta de stock y una de fotos para toda la página, no una por producto.
        Map<Long, List<VariantStock>> stockByProduct = catalogRepository.findActiveVariantStock(productIds).stream()
                .collect(Collectors.groupingBy(VariantStock::getProductId));
        Map<Long, List<ProductImage>> imagesByProduct = imageRepository.findVisibleOfProducts(productIds).stream()
                .collect(Collectors.groupingBy(StoreCatalogServiceImpl::ownerProductId));

        return PageResponse.of(page, row -> {
            boolean anyInStock = stockByProduct.getOrDefault(row.getId(), List.of()).stream()
                    .anyMatch(stock -> stock.getQuantity() > 0);
            return new StoreProductSummaryResponse(
                    row.getId(),
                    row.getName(),
                    row.getCategoryId(),
                    row.getCategoryName(),
                    coverOf(imagesByProduct.getOrDefault(row.getId(), List.of())),
                    StorePrices.webPrice(row.getMinPrice(), company),
                    StorePrices.webPrice(row.getMaxPrice(), company),
                    anyInStock ? StoreAvailability.AVAILABLE : StoreAvailability.OUT_OF_STOCK
            );
        });
    }

    @Override
    public StoreProductResponse findProduct(Long id) {
        Company company = currentCompany();
        // Despublicado, inactivo o de otra empresa: 404 igual, sin distinguir.
        Product product = catalogRepository.findVisibleProduct(id, company.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        List<ProductVariant> variants = catalogRepository.findActiveVariantsWithAttributes(product.getId());
        Map<Long, Long> stockByVariant = catalogRepository.findActiveVariantStock(List.of(product.getId())).stream()
                .collect(Collectors.toMap(VariantStock::getVariantId, VariantStock::getQuantity));
        List<ProductImage> images = imageRepository.findVisibleOfProducts(List.of(product.getId()));

        List<String> productImages = urls(images.stream().filter(image -> image.getVariant() == null).toList());
        Map<Long, List<ProductImage>> imagesByVariant = images.stream()
                .filter(image -> image.getVariant() != null)
                .collect(Collectors.groupingBy(image -> image.getVariant().getId()));

        List<StoreProductResponse.Variant> variantResponses = variants.stream()
                .map(variant -> {
                    List<String> own = urls(imagesByVariant.getOrDefault(variant.getId(), List.of()));
                    return new StoreProductResponse.Variant(
                            variant.getId(),
                            attributesOf(variant),
                            StorePrices.webPrice(variant.getPrice(), company),
                            own.isEmpty() ? productImages : own,
                            availabilityOf(stockByVariant.getOrDefault(variant.getId(), 0L))
                    );
                })
                .toList();

        BigDecimal minPrice = variants.stream().map(ProductVariant::getPrice).min(Comparator.naturalOrder()).orElseThrow();
        BigDecimal maxPrice = variants.stream().map(ProductVariant::getPrice).max(Comparator.naturalOrder()).orElseThrow();
        String cover = coverOf(images);
        return new StoreProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                // Sin fotos propias, la galería del producto arranca por la portada (de una variante).
                productImages.isEmpty() && cover != null ? List.of(cover) : productImages,
                StorePrices.webPrice(minPrice, company),
                StorePrices.webPrice(maxPrice, company),
                variantResponses
        );
    }

    static StoreAvailability availabilityOf(long quantity) {
        if (quantity <= 0) {
            return StoreAvailability.OUT_OF_STOCK;
        }
        return quantity <= LOW_STOCK_THRESHOLD ? StoreAvailability.LOW_STOCK : StoreAvailability.AVAILABLE;
    }

    private Company currentCompany() {
        Long companyId = CurrentStore.require().companyId();
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Store not found"));
    }

    /**
     * Portada: la primera foto del producto o, si no tiene, la primera de la primera variante
     * (por id) que tenga. Las fotos llegan ordenadas por sortOrder.
     */
    private String coverOf(List<ProductImage> images) {
        return images.stream()
                .filter(image -> image.getVariant() == null)
                .findFirst()
                .or(() -> images.stream()
                        .filter(image -> image.getVariant() != null)
                        .min(Comparator.comparing((ProductImage image) -> image.getVariant().getId())
                                .thenComparingInt(ProductImage::getSortOrder)
                                .thenComparing(ProductImage::getId)))
                .map(image -> storage.publicUrl(image.getStorageKey()))
                .orElse(null);
    }

    private List<String> urls(List<ProductImage> images) {
        return images.stream().map(image -> storage.publicUrl(image.getStorageKey())).toList();
    }

    private static List<StoreProductResponse.Attribute> attributesOf(ProductVariant variant) {
        return variant.getAttributes().stream()
                .map(ProductVariantAttribute::getAttributeValue)
                .filter(Objects::nonNull)
                .map(value -> new StoreProductResponse.Attribute(value.getAttribute().getName(), value.getValue()))
                .sorted(Comparator.comparing(StoreProductResponse.Attribute::name))
                .toList();
    }

    private static Long ownerProductId(ProductImage image) {
        return image.getProduct() != null ? image.getProduct().getId() : image.getVariant().getProduct().getId();
    }
}
