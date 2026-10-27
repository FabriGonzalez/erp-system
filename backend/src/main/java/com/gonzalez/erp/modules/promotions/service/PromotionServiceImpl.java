package com.gonzalez.erp.modules.promotions.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.common.util.BusinessDate;
import com.gonzalez.erp.common.util.SearchText;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.promotions.dto.request.PromotionItemRequest;
import com.gonzalez.erp.modules.promotions.dto.request.PromotionRequest;
import com.gonzalez.erp.modules.promotions.dto.response.PromotionResponse;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionItem;
import com.gonzalez.erp.modules.promotions.entity.PromotionStatus;
import com.gonzalez.erp.modules.promotions.exception.InvalidPromotionException;
import com.gonzalez.erp.modules.promotions.mapper.PromotionMapper;
import com.gonzalez.erp.modules.promotions.repository.PromotionItemRepository;
import com.gonzalez.erp.modules.promotions.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PromotionServiceImpl implements PromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionItemRepository promotionItemRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final CompanyRepository companyRepository;

    @Override
    public PageResponse<PromotionResponse> findAll(String query, PromotionStatus status, Pageable pageable) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        String search = SearchText.normalize(query);
        LocalDate today = BusinessDate.today();

        Page<Promotion> page = promotionRepository.search(
                companyId,
                search != null,
                SearchText.containsPattern(search),
                today,
                status == PromotionStatus.ACTIVE,
                status == PromotionStatus.SCHEDULED,
                status == PromotionStatus.EXPIRED,
                status == PromotionStatus.INACTIVE,
                pageable);

        // Productos y variantes de toda la página en una consulta cada uno.
        List<Long> promotionIds = page.getContent().stream().map(Promotion::getId).toList();
        List<PromotionItem> items = promotionIds.isEmpty()
                ? List.of()
                : promotionItemRepository.findByPromotionIdInWithProduct(promotionIds);
        Map<Long, List<PromotionItem>> itemsByPromotion = items.stream()
                .collect(Collectors.groupingBy(item -> item.getPromotion().getId()));
        Map<Long, List<ProductVariant>> variantsByProduct = activeVariantsByProduct(items);

        return PageResponse.of(page, promotion -> PromotionMapper.toResponse(
                promotion, itemsByPromotion.getOrDefault(promotion.getId(), List.of()), variantsByProduct, today));
    }

    @Override
    public PromotionResponse findById(Long id) {
        return toResponse(findPromotionOrThrow(id));
    }

    @Override
    @Transactional
    public PromotionResponse create(PromotionRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        validateDates(request);
        List<PromotionItem> items = buildItems(request.items(), companyId);

        Promotion promotion = Promotion.builder()
                .company(companyRepository.getReferenceById(companyId))
                .name(request.name().trim())
                .description(blankToNull(request.description()))
                .price(request.price())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .build();
        promotion.replaceItems(items);

        return toResponse(promotionRepository.saveAndFlush(promotion));
    }

    /** Lo ya vendido no cambia: los pedidos guardan una copia de la promo. */
    @Override
    @Transactional
    public PromotionResponse update(Long id, PromotionRequest request) {
        Promotion promotion = findPromotionOrThrow(id);
        validateDates(request);
        List<PromotionItem> items = buildItems(request.items(), promotion.getCompany().getId());

        promotion.update(
                request.name().trim(),
                blankToNull(request.description()),
                request.price(),
                request.startDate(),
                request.endDate());
        promotion.replaceItems(items);

        return toResponse(promotionRepository.saveAndFlush(promotion));
    }

    @Override
    @Transactional
    public PromotionResponse activate(Long id) {
        Promotion promotion = findPromotionOrThrow(id);
        promotion.activate();
        return toResponse(promotion);
    }

    @Override
    @Transactional
    public PromotionResponse deactivate(Long id) {
        Promotion promotion = findPromotionOrThrow(id);
        promotion.deactivate();
        return toResponse(promotion);
    }

    private PromotionResponse toResponse(Promotion promotion) {
        List<PromotionItem> items = promotionItemRepository.findByPromotionIdInWithProduct(List.of(promotion.getId()));
        return PromotionMapper.toResponse(promotion, items, activeVariantsByProduct(items), BusinessDate.today());
    }

    private Map<Long, List<ProductVariant>> activeVariantsByProduct(List<PromotionItem> items) {
        List<Long> productIds = items.stream().map(item -> item.getProduct().getId()).distinct().toList();
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return productVariantRepository.findByProductIdInAndActiveTrue(productIds).stream()
                .collect(Collectors.groupingBy(variant -> variant.getProduct().getId()));
    }

    private static void validateDates(PromotionRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw new InvalidPromotionException("endDate must be on or after startDate");
        }
    }

    /** Productos activos de la empresa, sin repetir. El precio puede superar la suma de los sueltos (lo avisa el frontend). */
    private List<PromotionItem> buildItems(List<PromotionItemRequest> requests, Long companyId) {
        Set<Long> seenProducts = new HashSet<>();
        List<PromotionItem> items = new ArrayList<>();

        for (PromotionItemRequest request : requests) {
            if (!seenProducts.add(request.productId())) {
                throw new InvalidPromotionException(
                        "Duplicate product in promotion items: " + request.productId());
            }

            Product product = productRepository.findByIdAndCompanyId(request.productId(), companyId)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Product not found with id: " + request.productId()));

            if (!product.isActive()) {
                throw new InvalidPromotionException("Product " + product.getId() + " is inactive");
            }

            items.add(PromotionItem.builder()
                    .product(product)
                    .quantity(request.quantity())
                    .build());
        }
        return items;
    }

    private Promotion findPromotionOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        return promotionRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Promotion not found with id: " + id));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
