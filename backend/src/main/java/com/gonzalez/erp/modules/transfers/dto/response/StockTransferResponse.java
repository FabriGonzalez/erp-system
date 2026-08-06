package com.gonzalez.erp.modules.transfers.dto.response;

import com.gonzalez.erp.modules.transfers.entity.StockTransferStatus;

import java.time.LocalDateTime;
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
        LocalDateTime confirmedAt,
        List<StockTransferItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
