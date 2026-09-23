package com.gonzalez.erp.modules.transfers.dto.response;

public record StockTransferItemResponse(
        Long id,
        Long productId,
        String productName,
        Long productVariantId,
        String productVariantSku,
        Integer quantity
) {}
