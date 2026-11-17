package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import org.springframework.data.domain.Pageable;

public interface StockMovementService {

    /** Filtros opcionales (null = sin filtrar). Un stockId ajeno o inexistente da 404. */
    PageResponse<StockMovementResponse> search(
            Long stockId,
            Long branchId,
            Long productVariantId,
            StockMovementType type,
            Pageable pageable);

    StockMovementResponse findById(Long id);
}
