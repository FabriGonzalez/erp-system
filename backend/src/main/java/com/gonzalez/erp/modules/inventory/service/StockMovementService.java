package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;

import java.util.List;

public interface StockMovementService {

    List<StockMovementResponse> findAll();

    StockMovementResponse findById(Long id);

    List<StockMovementResponse> findByStockId(Long stockId);

    List<StockMovementResponse> findByType(StockMovementType type);
}