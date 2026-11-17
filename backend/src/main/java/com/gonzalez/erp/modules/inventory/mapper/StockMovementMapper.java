package com.gonzalez.erp.modules.inventory.mapper;

import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.users.entity.User;

public final class StockMovementMapper {

    private StockMovementMapper() {
    }

    /** Espera stock, variante, producto, sucursal y usuario ya cargados (ver StockMovementRepository). */
    public static StockMovementResponse toResponse(StockMovement movement) {
        Stock stock = movement.getStock();
        ProductVariant variant = stock.getProductVariant();
        User createdBy = movement.getCreatedBy();
        return new StockMovementResponse(
                movement.getId(),
                stock.getId(),
                variant.getProduct().getId(),
                variant.getProduct().getName(),
                variant.getId(),
                variant.getSku(),
                stock.getBranch().getId(),
                stock.getBranch().getName(),
                movement.getType(),
                movement.getQuantity(),
                movement.getPreviousQuantity(),
                movement.getNewQuantity(),
                movement.getReason(),
                movement.getReferenceId(),
                movement.getReferenceType(),
                createdBy != null ? createdBy.getId() : null,
                createdBy != null ? createdBy.getUsername() : null,
                movement.getCreatedAt(),
                movement.getUpdatedAt()
        );
    }
}
