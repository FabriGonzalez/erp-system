package com.gonzalez.erp.modules.inventory.mapper;

import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.entity.Stock;

public final class StockMapper {

    private StockMapper() {}

    public static StockResponse toResponse(Stock stock) {
        return new StockResponse(
                stock.getId(),
                stock.getProduct().getId(),
                stock.getProduct().getName(),
                stock.getBranch().getId(),
                stock.getBranch().getName(),
                stock.getQuantity(),
                stock.getCreatedAt(),
                stock.getUpdatedAt()
        );
    }
}
