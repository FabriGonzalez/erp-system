package com.gonzalez.erp.modules.orders.dto.response;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        String productId,
        String productName,
        Integer quantity,
        BigDecimal unitPrice
) {
}
