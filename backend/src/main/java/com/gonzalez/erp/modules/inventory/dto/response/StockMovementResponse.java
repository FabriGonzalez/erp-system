package com.gonzalez.erp.modules.inventory.dto.response;

import com.gonzalez.erp.modules.inventory.entity.StockMovementType;

import java.time.Instant;

public record StockMovementResponse(
        Long id,
        Long stockId,
        Long productId,
        String productName,
        Long productVariantId,
        String productVariantSku,
        Long branchId,
        String branchName,
        StockMovementType type,
        /** Delta con signo: negativo si el stock bajó. */
        Integer quantity,
        Integer previousQuantity,
        Integer newQuantity,
        String reason,
        Long referenceId,
        /** ORDER, STOCK_TRANSFER, PRODUCT_CREATION, PRODUCT_UPDATE o null (ajuste manual). */
        String referenceType,
        /** Null en los movimientos registrados antes de guardar el usuario. */
        Long createdById,
        String createdByUsername,
        Instant createdAt,
        Instant updatedAt
) {
}
