package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductVariantResponse;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.entity.ProductVariantAttribute;
import com.gonzalez.erp.modules.products.exception.ProductCategoryNotActiveException;
import com.gonzalez.erp.modules.products.exception.ProductVariantSkuAlreadyExistsException;
import com.gonzalez.erp.modules.products.mapper.ProductMapper;
import com.gonzalez.erp.modules.products.mapper.ProductVariantMapper;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductAttributeValueRepository attributeValueRepository;
    private final CategoryRepository categoryRepository;
    private final CompanyRepository companyRepository;

    @Override
    public List<ProductResponse> findAll(Boolean active) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        List<Product> products = (active != null)
                ? productRepository.findByCompanyIdAndActive(companyId, active)
                : productRepository.findByCompanyId(companyId);

        if (products.isEmpty()) {
            return List.of();
        }

        List<Long> productIds = products.stream()
                .map(Product::getId)
                .toList();

        Map<Long, List<ProductVariantResponse>> variantsByProduct =
                variantRepository.findByProductIdInWithAttributes(productIds)
                        .stream()
                        .collect(Collectors.groupingBy(
                                pv -> pv.getProduct().getId(),
                                Collectors.mapping(
                                        ProductVariantMapper::toResponse,
                                        Collectors.toList()
                                )
                        ));

        return products.stream()
                .map(product -> ProductMapper.toResponse(
                        product,
                        variantsByProduct.getOrDefault(
                                product.getId(),
                                List.of()
                        )
                ))
                .toList();
    }

    @Override
    public ProductResponse findById(Long id) {
        Product product = findProductOrThrow(id);

        List<ProductVariantResponse> variantResponses =
                loadVariantsForProduct(product.getId());

        return ProductMapper.toResponse(
                product,
                variantResponses
        );
    }

    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        Category category = findCategoryOrThrow(request.categoryId());
        checkCategoryActive(category);

        Company company = companyRepository.getReferenceById(companyId);

        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .category(category)
                .company(company)
                .build();

        Product savedProduct = productRepository.saveAndFlush(product);

        List<ProductVariantResponse> variantResponses =
                createVariants(
                        savedProduct,
                        request.variants(),
                        companyId
                );

        return ProductMapper.toResponse(
                savedProduct,
                variantResponses
        );
    }

    @Override
    @Transactional
    public ProductResponse update(
            Long id,
            ProductUpdateRequest request
    ) {
        Product product = findProductOrThrow(id);

        Long companyId = SecurityUtils.requireCurrentCompanyId();

        Category category = findCategoryOrThrow(request.categoryId());
        checkCategoryActive(category);

        product.update(
                request.name(),
                request.description(),
                category
        );

        List<ProductVariantResponse> variantResponses =
                updateVariants(
                        product,
                        request.variants(),
                        companyId
                );

        return ProductMapper.toResponse(
                product,
                variantResponses
        );
    }

    @Override
    @Transactional
    public ProductResponse deactivate(Long id) {
        Product product = findProductOrThrow(id);

        product.deactivate();

        List<ProductVariantResponse> variantResponses =
                loadVariantsForProduct(product.getId());

        return ProductMapper.toResponse(
                product,
                variantResponses
        );
    }

    @Override
    @Transactional
    public ProductResponse activate(Long id) {
        Product product = findProductOrThrow(id);

        product.activate();

        List<ProductVariantResponse> variantResponses =
                loadVariantsForProduct(product.getId());

        return ProductMapper.toResponse(
                product,
                variantResponses
        );
    }

    private List<ProductVariantResponse> createVariants(
            Product product,
            List<ProductVariantRequest> variantRequests,
            Long companyId
    ) {
        Set<String> seenSkus = new HashSet<>();

        for (ProductVariantRequest vr : variantRequests) {
            validateSkuUnique(
                    vr.sku(),
                    companyId,
                    null,
                    seenSkus
            );

            validateAttributeValueIds(
                    vr.attributeValueIds(),
                    companyId
            );

            validateOneValuePerAttribute(
                    vr.attributeValueIds(),
                    vr.sku()
            );
        }

        List<ProductVariantResponse> responses = new ArrayList<>();

        for (ProductVariantRequest vr : variantRequests) {
            ProductVariant variant = ProductVariant.builder()
                    .product(product)
                    .sku(vr.sku())
                    .price(vr.price())
                    .company(product.getCompany())
                    .build();

            ProductVariant savedVariant =
                    variantRepository.saveAndFlush(variant);

            createVariantAttributes(
                    savedVariant,
                    vr.attributeValueIds()
            );

            responses.add(
                    ProductVariantMapper.toResponse(savedVariant)
            );
        }

        return responses;
    }

    private List<ProductVariantResponse> updateVariants(
            Product product,
            List<ProductVariantRequest> variantRequests,
            Long companyId
    ) {
        Set<String> incomingSkus = variantRequests.stream()
                .map(ProductVariantRequest::sku)
                .collect(Collectors.toSet());

        List<ProductVariant> existingVariants =
                variantRepository.findByProductId(product.getId());

        for (ProductVariant existing : existingVariants) {
            if (!incomingSkus.contains(existing.getSku())) {
                existing.deactivate();
            }
        }

        Set<String> seenSkus = new HashSet<>();

        for (ProductVariantRequest vr : variantRequests) {
            Optional<ProductVariant> existingForSku =
                    existingVariants.stream()
                            .filter(v -> v.getSku().equals(vr.sku()))
                            .findFirst();

            Long excludeId = existingForSku
                    .map(ProductVariant::getId)
                    .orElse(null);

            validateSkuUnique(
                    vr.sku(),
                    companyId,
                    excludeId,
                    seenSkus
            );

            validateAttributeValueIds(
                    vr.attributeValueIds(),
                    companyId
            );

            validateOneValuePerAttribute(
                    vr.attributeValueIds(),
                    vr.sku()
            );
        }

        List<ProductVariantResponse> responses = new ArrayList<>();

        for (ProductVariantRequest vr : variantRequests) {
            Optional<ProductVariant> existingOpt =
                    existingVariants.stream()
                            .filter(v -> v.getSku().equals(vr.sku()))
                            .findFirst();

            ProductVariant variant;

            if (existingOpt.isPresent()) {
                variant = existingOpt.get();

                variant.update(
                        vr.sku(),
                        vr.price()
                );

                /*
                 * No reemplazamos la colección administrada por Hibernate.
                 * Simplemente eliminamos sus elementos existentes.
                 */
                variant.getAttributes().clear();

            } else {
                variant = ProductVariant.builder()
                        .product(product)
                        .sku(vr.sku())
                        .price(vr.price())
                        .company(product.getCompany())
                        .build();
            }

            ProductVariant savedVariant =
                    variantRepository.saveAndFlush(variant);

            createVariantAttributes(
                    savedVariant,
                    vr.attributeValueIds()
            );

            responses.add(
                    ProductVariantMapper.toResponse(savedVariant)
            );
        }

        return responses;
    }

    private void createVariantAttributes(
            ProductVariant variant,
            List<Long> attributeValueIds
    ) {
        for (Long valueId : attributeValueIds) {
            ProductAttributeValue value =
                    attributeValueRepository.getReferenceById(valueId);

            ProductVariantAttribute pva =
                    ProductVariantAttribute.builder()
                            .variant(variant)
                            .attributeValue(value)
                            .build();

            variant.getAttributes().add(pva);
        }
    }

    private List<ProductVariantResponse> loadVariantsForProduct(
            Long productId
    ) {
        List<ProductVariant> variants =
                variantRepository.findByProductIdInWithAttributes(
                        List.of(productId)
                );

        return variants.stream()
                .map(ProductVariantMapper::toResponse)
                .toList();
    }

    private void validateSkuUnique(
            String sku,
            Long companyId,
            Long excludeVariantId,
            Set<String> seenSkus
    ) {
        if (!seenSkus.add(sku)) {
            throw new ProductVariantSkuAlreadyExistsException(sku);
        }

        boolean existsInDb =
                (excludeVariantId != null)
                        ? variantRepository
                        .existsBySkuAndCompanyIdAndIdNot(
                                sku,
                                companyId,
                                excludeVariantId
                        )
                        : variantRepository
                        .existsBySkuAndCompanyId(
                                sku,
                                companyId
                        );

        if (existsInDb) {
            throw new ProductVariantSkuAlreadyExistsException(sku);
        }
    }

    private void validateAttributeValueIds(
            List<Long> attributeValueIds,
            Long companyId
    ) {
        for (Long valueId : attributeValueIds) {
            ProductAttributeValue value =
                    attributeValueRepository.findById(valueId)
                            .orElseThrow(() ->
                                    new ResourceNotFoundException(
                                            "Attribute value not found with id: "
                                                    + valueId
                                    )
                            );

            if (value.getAttribute().getCompany() == null
                    || !companyId.equals(
                    value.getAttribute()
                            .getCompany()
                            .getId()
            )) {

                throw new ResourceNotFoundException(
                        "Attribute value not found with id: "
                                + valueId
                );
            }
        }
    }

    private void validateOneValuePerAttribute(
            List<Long> attributeValueIds,
            String sku
    ) {
        Set<Long> seenAttributes = new HashSet<>();

        for (Long valueId : attributeValueIds) {
            ProductAttributeValue value =
                    attributeValueRepository.getReferenceById(valueId);

            Long attributeId =
                    value.getAttribute().getId();

            if (!seenAttributes.add(attributeId)) {
                throw new IllegalArgumentException(
                        "Variant '%s' has multiple values for attribute '%s'"
                                .formatted(
                                        sku,
                                        value.getAttribute().getName()
                                )
                );
            }
        }
    }

    private Product findProductOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return productRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product not found with id: " + id
                        )
                );
    }

    private Category findCategoryOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return categoryRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Category not found with id: " + id
                        )
                );
    }

    private void checkCategoryActive(Category category) {
        if (!category.isActive()) {
            throw new ProductCategoryNotActiveException(
                    category.getName()
            );
        }
    }
}