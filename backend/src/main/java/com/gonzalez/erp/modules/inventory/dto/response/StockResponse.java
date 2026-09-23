package com.gonzalez.erp.modules.inventory.dto.response;

import java.time.Instant;

public record StockResponse(
        Long id,
        Long productId,
        String productName,
        Long productVariantId,
        String productVariantSku,
        Long branchId,
        String branchName,
        Integer quantity,
        Instant createdAt,
        Instant updatedAt
) {}
