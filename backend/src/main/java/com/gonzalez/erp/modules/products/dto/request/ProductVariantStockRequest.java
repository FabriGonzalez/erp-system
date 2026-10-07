package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ProductVariantStockRequest(
        @NotNull(message = "Branch is required")
        Long branchId,

        @NotNull(message = "Stock quantity is required")
        @Min(value = 0, message = "Stock quantity cannot be negative")
        Integer quantity
) {}
