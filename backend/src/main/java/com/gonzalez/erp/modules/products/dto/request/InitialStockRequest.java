package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record InitialStockRequest(
        @NotNull(message = "Branch is required")
        Long branchId,

        @NotNull(message = "Initial stock quantity is required")
        @Min(value = 0, message = "Initial stock quantity cannot be negative")
        Integer quantity
) {}
