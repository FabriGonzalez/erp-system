package com.gonzalez.erp.modules.inventory.dto.response;

import java.time.LocalDateTime;

public record StockResponse(
        Long id,
        Long productId,
        String productName,
        Long branchId,
        String branchName,
        Integer quantity,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}