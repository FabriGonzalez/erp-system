package com.gonzalez.erp.modules.orders.dto.response;

import java.math.BigDecimal;
import java.util.List;

/** Promo vendida, como quedó al venderla. */
public record OrderPromoResponse(
        Long id,
        Long promotionId,
        String name,
        BigDecimal unitPrice,
        Integer quantity,
        List<Component> components
) {
    /** quantity = unidades por cada promo. */
    public record Component(
            Long productId,
            String productName,
            Long productVariantId,
            String productVariantSku,
            String variantName,
            Integer quantity
    ) {}
}
