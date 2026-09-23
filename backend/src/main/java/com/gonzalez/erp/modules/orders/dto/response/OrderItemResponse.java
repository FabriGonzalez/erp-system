package com.gonzalez.erp.modules.orders.dto.response;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        Long productVariantId,
        String productVariantSku,
        Integer quantity,
        BigDecimal unitPrice
) {}
