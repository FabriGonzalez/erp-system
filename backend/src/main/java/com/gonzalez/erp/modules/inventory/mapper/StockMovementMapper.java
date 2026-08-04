package com.gonzalez.erp.modules.inventory.mapper;

import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;

public final class StockMovementMapper {

    private StockMovementMapper() {
    }

    public static StockMovementResponse toResponse(StockMovement movement) {
        return new StockMovementResponse(
                movement.getId(),
                movement.getStock().getId(),
                movement.getType(),
                movement.getQuantity(),
                movement.getPreviousQuantity(),
                movement.getNewQuantity(),
                movement.getReason(),
                movement.getReferenceId(),
                movement.getReferenceType(),
                movement.getCreatedAt(),
                movement.getUpdatedAt()
        );
    }
}