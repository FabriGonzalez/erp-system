package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;

import java.util.List;

public interface StockService {

    List<StockResponse> findAll();

    StockResponse findById(Long id);

    StockResponse findByProductIdAndBranchId(String productId, Long branchId);

    List<StockResponse> findByBranchId(Long branchId);

    List<StockResponse> findByProductId(String productId);

    StockResponse adjustStock(StockAdjustRequest request);
}