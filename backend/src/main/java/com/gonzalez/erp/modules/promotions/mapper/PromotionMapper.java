package com.gonzalez.erp.modules.promotions.mapper;

import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.promotions.dto.response.PromotionItemResponse;
import com.gonzalez.erp.modules.promotions.dto.response.PromotionResponse;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public final class PromotionMapper {

    private PromotionMapper() {}

    /** activeVariantsByProduct: variantes activas de los productos de la promo, para los precios. */
    public static PromotionResponse toResponse(Promotion promotion, List<PromotionItem> items,
                                               Map<Long, List<ProductVariant>> activeVariantsByProduct,
                                               LocalDate today) {
        List<PromotionItemResponse> itemResponses = items.stream()
                .map(item -> toItemResponse(item, activeVariantsByProduct.getOrDefault(item.getProduct().getId(), List.of())))
                .toList();

        return new PromotionResponse(
                promotion.getId(),
                promotion.getName(),
                promotion.getDescription(),
                promotion.getPrice(),
                promotion.getStartDate(),
                promotion.getEndDate(),
                promotion.isActive(),
                promotion.statusOn(today),
                regularPrice(itemResponses, PromotionItemResponse::minPrice),
                regularPrice(itemResponses, PromotionItemResponse::maxPrice),
                itemResponses,
                promotion.getCreatedAt(),
                promotion.getUpdatedAt()
        );
    }

    /** Valores de los atributos de la variante, p. ej. "Rojo · M". */
    public static String variantName(ProductVariant variant) {
        return variant.getAttributes().stream()
                .map(attribute -> attribute.getAttributeValue().getValue())
                .collect(Collectors.joining(" · "));
    }

    public static boolean isSellable(ProductVariant variant) {
        return variant.isActive() && variant.getProduct().isActive();
    }

    private static BigDecimal regularPrice(List<PromotionItemResponse> items,
                                           Function<PromotionItemResponse, BigDecimal> price) {
        return items.stream()
                .filter(item -> price.apply(item) != null)
                .map(item -> price.apply(item).multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static PromotionItemResponse toItemResponse(PromotionItem item, List<ProductVariant> activeVariants) {
        BigDecimal minPrice = activeVariants.stream().map(ProductVariant::getPrice)
                .min(Comparator.naturalOrder()).orElse(null);
        BigDecimal maxPrice = activeVariants.stream().map(ProductVariant::getPrice)
                .max(Comparator.naturalOrder()).orElse(null);

        return new PromotionItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity(),
                minPrice,
                maxPrice,
                item.getProduct().isActive() && !activeVariants.isEmpty()
        );
    }
}
