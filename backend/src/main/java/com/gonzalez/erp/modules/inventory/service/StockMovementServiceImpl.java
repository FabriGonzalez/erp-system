package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.mapper.StockMovementMapper;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockMovementServiceImpl implements StockMovementService {

    private final StockMovementRepository stockMovementRepository;
    private final StockRepository stockRepository;

    @Override
    public PageResponse<StockMovementResponse> search(
            Long stockId,
            Long branchId,
            Long productVariantId,
            StockMovementType type,
            Pageable pageable) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        // Sin esto, un stock de otra empresa respondería como uno sin movimientos.
        if (stockId != null && stockRepository.findByIdAndCompanyId(stockId, companyId).isEmpty()) {
            throw new StockNotFoundException(stockId);
        }

        return PageResponse.of(
                stockMovementRepository.search(companyId, stockId, branchId, productVariantId, type, pageable),
                StockMovementMapper::toResponse);
    }

    @Override
    public StockMovementResponse findById(Long id) {
        StockMovement movement = findMovementOrThrow(id);
        return StockMovementMapper.toResponse(movement);
    }

    private StockMovement findMovementOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return stockMovementRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock movement not found with id: " + id));
    }
}
