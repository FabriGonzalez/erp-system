package com.gonzalez.erp.modules.transfers.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StockTransferItemRequest(
        @NotNull(message = "productVariantId is required")
        Long productVariantId,

        @Min(value = 1, message = "Quantity must be at least 1")
        @NotNull(message = "quantity is required")
        Integer quantity
) {}
