package com.gonzalez.erp.modules.orders.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record OrderItemRequest(
        @NotNull(message = "productId is required")
        Long productId,

        @Min(value = 1, message = "Quantity must be at least 1")
        @NotNull(message = "quantity is required")
        Integer quantity
) {
}
