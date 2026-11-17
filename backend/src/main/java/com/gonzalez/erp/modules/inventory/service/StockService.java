package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;

import org.springframework.data.domain.Pageable;

import java.util.List;

public interface StockService {

    /**
     * Stock de la empresa; filtros opcionales: sucursal, texto (producto o SKU), variantes y
     * valores de atributo (AttributeValueFilters).
     */
    PageResponse<StockResponse> search(Long branchId, String query, List<Long> variantIds,
                                       List<Long> attributeValueIds, Pageable pageable);

    StockResponse findById(Long id);

    StockResponse findByProductVariantIdAndBranchId(Long productVariantId, Long branchId);

    List<StockResponse> findByBranchId(Long branchId);

    List<StockResponse> findByProductVariantId(Long productVariantId);

    void createInitialStock(Long productVariantId, Long branchId, Integer quantity);

    StockResponse adjustStock(StockAdjustRequest request);
}
