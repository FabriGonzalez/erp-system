package com.gonzalez.erp.modules.inventory.mapper;

import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.entity.Stock;

public final class StockMapper {

    private StockMapper() {}

    public static StockResponse toResponse(Stock stock) {
        return new StockResponse(
                stock.getId(),
                stock.getProductVariant().getProduct().getId(),
                stock.getProductVariant().getProduct().getName(),
                stock.getProductVariant().getId(),
                stock.getProductVariant().getSku(),
                stock.getBranch().getId(),
                stock.getBranch().getName(),
                stock.getQuantity(),
                stock.getCreatedAt(),
                stock.getUpdatedAt()
        );
    }
}
