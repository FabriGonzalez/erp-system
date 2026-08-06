package com.gonzalez.erp.modules.transfers.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record StockTransferRequest(
        @NotNull(message = "originBranchId is required")
        Long originBranchId,

        @NotNull(message = "destinationBranchId is required")
        Long destinationBranchId,

        @NotEmpty(message = "At least one item is required")
        List<@Valid StockTransferItemRequest> items
) {
}
