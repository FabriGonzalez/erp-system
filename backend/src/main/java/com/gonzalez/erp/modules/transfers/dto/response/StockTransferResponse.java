package com.gonzalez.erp.modules.transfers.dto.response;

import com.gonzalez.erp.modules.transfers.entity.StockTransferStatus;

import java.time.Instant;
import java.util.List;

public record StockTransferResponse(
        Long id,
        Long originBranchId,
        String originBranchName,
        Long destinationBranchId,
        String destinationBranchName,
        StockTransferStatus status,
        Long createdById,
        String createdByUsername,
        Instant confirmedAt,
        List<StockTransferItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
}
