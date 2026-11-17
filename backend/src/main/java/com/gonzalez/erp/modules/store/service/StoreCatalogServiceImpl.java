package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.common.util.BusinessDate;
import com.gonzalez.erp.common.util.SearchText;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductImage;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductImageRepository;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionItem;
import com.gonzalez.erp.modules.store.dto.StoreAvailability;
import com.gonzalez.erp.modules.store.dto.StoreCategoryResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductSummaryResponse;
import com.gonzalez.erp.modules.store.dto.StorePromotionResponse;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository;
import com.gonzalez.erp.modules.store.repository.StoreCatalogRepository.ProductMinPrice;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    private final StoreProductViews views;

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
                .collect(Collectors.groupingBy(StoreProductViews::ownerProductId));

        return PageResponse.of(page, row -> {
            boolean anyInStock = stockByProduct.getOrDefault(row.getId(), List.of()).stream()
                    .anyMatch(stock -> stock.getQuantity() > 0);
            return new StoreProductSummaryResponse(
                    row.getId(),
                    row.getName(),
                    row.getCategoryId(),
                    row.getCategoryName(),
                    views.coverOf(imagesByProduct.getOrDefault(row.getId(), List.of())),
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

        List<String> productImages = views.urls(images.stream().filter(image -> image.getVariant() == null).toList());
        Map<Long, List<ProductImage>> imagesByVariant = images.stream()
                .filter(image -> image.getVariant() != null)
                .collect(Collectors.groupingBy(image -> image.getVariant().getId()));

        List<StoreProductResponse.Variant> variantResponses = variants.stream()
                .map(variant -> {
                    List<String> own = views.urls(imagesByVariant.getOrDefault(variant.getId(), List.of()));
                    return new StoreProductResponse.Variant(
                            variant.getId(),
                            StoreProductViews.attributesOf(variant),
                            StorePrices.webPrice(variant.getPrice(), company),
                            own.isEmpty() ? productImages : own,
                            availabilityOf(stockByVariant.getOrDefault(variant.getId(), 0L))
                    );
                })
                .toList();

        BigDecimal minPrice = variants.stream().map(ProductVariant::getPrice).min(Comparator.naturalOrder()).orElseThrow();
        BigDecimal maxPrice = variants.stream().map(ProductVariant::getPrice).max(Comparator.naturalOrder()).orElseThrow();
        String cover = views.coverOf(images);
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

    @Override
    public List<StorePromotionResponse> findPromotions() {
        Company company = currentCompany();
        List<Promotion> promotions = catalogRepository.findVisiblePromotions(company.getId(), BusinessDate.today());
        if (promotions.isEmpty()) {
            return List.of();
        }

        // Precios, stock y fotos de todos los productos de todas las promos en tres consultas.
        Set<Long> productIds = promotions.stream()
                .flatMap(promotion -> promotion.getItems().stream())
                .map(item -> item.getProduct().getId())
                .collect(Collectors.toSet());
        Map<Long, BigDecimal> minPriceByProduct = catalogRepository.findActiveMinPrices(productIds).stream()
                .collect(Collectors.toMap(ProductMinPrice::getProductId, ProductMinPrice::getMinPrice));
        Map<Long, Long> stockByProduct = catalogRepository.findActiveVariantStock(productIds).stream()
                .collect(Collectors.groupingBy(VariantStock::getProductId,
                        Collectors.summingLong(VariantStock::getQuantity)));
        Map<Long, String> coverByProduct = new HashMap<>();
        imageRepository.findVisibleOfProducts(productIds).stream()
                .collect(Collectors.groupingBy(StoreProductViews::ownerProductId))
                .forEach((productId, images) -> coverByProduct.put(productId, views.coverOf(images)));

        return promotions.stream()
                .map(promotion -> toPromotionResponse(promotion, company, minPriceByProduct, stockByProduct, coverByProduct))
                .toList();
    }

    /*
     * Por separado = el precio web de la variante activa más barata de cada producto por la
     * cantidad. El precio web nunca baja si sube el ERP, así que el precio web del mínimo ERP es
     * el mínimo web. Con cualquier otra variante el comprador ahorra más: "al menos $X" no miente.
     * El stock se suma entre variantes porque las unidades de una promo pueden ser de variantes
     * distintas.
     */
    static StorePromotionResponse toPromotionResponse(
            Promotion promotion,
            Company company,
            Map<Long, BigDecimal> minPriceByProduct,
            Map<Long, Long> stockByProduct,
            Map<Long, String> coverByProduct
    ) {
        BigDecimal webPrice = StorePrices.webPrice(promotion.getPrice(), company);
        BigDecimal regularWebPrice = BigDecimal.ZERO;
        boolean available = true;
        for (PromotionItem item : promotion.getItems()) {
            Long productId = item.getProduct().getId();
            regularWebPrice = regularWebPrice.add(StorePrices.webPrice(minPriceByProduct.get(productId), company)
                    .multiply(BigDecimal.valueOf(item.getQuantity())));
            available &= stockByProduct.getOrDefault(productId, 0L) >= item.getQuantity();
        }
        BigDecimal savings = regularWebPrice.subtract(webPrice);
        boolean showSavings = savings.signum() > 0;

        List<StorePromotionResponse.Item> items = promotion.getItems().stream()
                .map(item -> new StorePromotionResponse.Item(
                        item.getProduct().getId(),
                        item.getProduct().getName(),
                        item.getQuantity(),
                        coverByProduct.get(item.getProduct().getId())))
                .toList();
        return new StorePromotionResponse(
                promotion.getId(),
                promotion.getName(),
                promotion.getDescription(),
                webPrice,
                showSavings ? regularWebPrice : null,
                showSavings ? savings : null,
                available ? StoreAvailability.AVAILABLE : StoreAvailability.OUT_OF_STOCK,
                promotion.getEndDate(),
                items
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
}
