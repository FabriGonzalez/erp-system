package com.gonzalez.erp.modules.promotions.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record PromotionItemRequest(
        @NotNull(message = "productId is required")
        Long productId,

        @NotNull(message = "quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        Integer quantity
) {}
