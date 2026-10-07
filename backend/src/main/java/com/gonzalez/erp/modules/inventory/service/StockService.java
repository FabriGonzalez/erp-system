package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;

import java.util.List;

public interface StockService {

    List<StockResponse> findAll();

    StockResponse findById(Long id);

    StockResponse findByProductVariantIdAndBranchId(Long productVariantId, Long branchId);

    List<StockResponse> findByBranchId(Long branchId);

    List<StockResponse> findByProductVariantId(Long productVariantId);

    void createInitialStock(Long productVariantId, Long branchId, Integer quantity);

    StockResponse adjustStock(StockAdjustRequest request);
}
