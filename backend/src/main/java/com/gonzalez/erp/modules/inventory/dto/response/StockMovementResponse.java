package com.gonzalez.erp.modules.inventory.dto.response;

import com.gonzalez.erp.modules.inventory.entity.StockMovementType;

import java.time.LocalDateTime;

public record StockMovementResponse(
        Long id,
        Long stockId,
        StockMovementType type,
        Integer quantity,
        Integer previousQuantity,
        Integer newQuantity,
        String reason,
        Long referenceId,
        String referenceType,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}