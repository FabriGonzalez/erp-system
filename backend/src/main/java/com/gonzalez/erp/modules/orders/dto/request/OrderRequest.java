package com.gonzalez.erp.modules.orders.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record OrderRequest(
        @NotNull(message = "branchId is required")
        Long branchId,

        Long customerId,

        @NotEmpty(message = "At least one item is required")
        List<@Valid OrderItemRequest> items
) {
}
