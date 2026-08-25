package com.gonzalez.erp.modules.transfers.dto.response;

public record StockTransferItemResponse(
        Long id,
        String productId,
        String productName,
        Integer quantity
) {
}
