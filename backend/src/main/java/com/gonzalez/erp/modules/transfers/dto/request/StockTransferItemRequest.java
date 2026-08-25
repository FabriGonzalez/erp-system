package com.gonzalez.erp.modules.transfers.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StockTransferItemRequest(
        @NotBlank(message = "productId is required")
        String productId,

        @Min(value = 1, message = "Quantity must be at least 1")
        @NotNull(message = "quantity is required")
        Integer quantity
) {
}
