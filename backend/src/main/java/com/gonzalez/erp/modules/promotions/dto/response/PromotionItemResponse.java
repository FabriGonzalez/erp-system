package com.gonzalez.erp.modules.promotions.dto.response;

import java.math.BigDecimal;

/**
 * Un producto de la promo. minPrice y maxPrice son los precios actuales de sus variantes
 * activas (null si no tiene ninguna). available = producto activo con alguna variante activa:
 * si no, la promo no se puede vender hasta editarla.
 */
public record PromotionItemResponse(
        Long id,
        Long productId,
        String productName,
        Integer quantity,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        boolean available
) {}
