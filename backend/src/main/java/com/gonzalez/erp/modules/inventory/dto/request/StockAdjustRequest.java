package com.gonzalez.erp.modules.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StockAdjustRequest(
        @NotNull(message = "productId is required")
        Long productId,

        @NotNull(message = "branchId is required")
        Long branchId,

        @Min(value = 0, message = "Quantity cannot be negative")
        @NotNull(message = "quantity is required")
        Integer newQuantity,

        @NotBlank(message = "reason is required")
        String reason
) {


}