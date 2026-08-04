package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.mapper.StockMovementMapper;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockMovementServiceImpl implements StockMovementService {

    private final StockMovementRepository stockMovementRepository;

    @Override
    public List<StockMovementResponse> findAll() {
        return stockMovementRepository.findAll().stream()
                .map(StockMovementMapper::toResponse)
                .toList();
    }

    @Override
    public StockMovementResponse findById(Long id) {
        StockMovement movement = findMovementOrThrow(id);
        return StockMovementMapper.toResponse(movement);
    }

    @Override
    public List<StockMovementResponse> findByStockId(Long stockId) {
        return stockMovementRepository.findByStockIdOrderByCreatedAtDesc(stockId).stream()
                .map(StockMovementMapper::toResponse)
                .toList();
    }

    @Override
    public List<StockMovementResponse> findByType(StockMovementType type) {
        return stockMovementRepository.findByType(type).stream()
                .map(StockMovementMapper::toResponse)
                .toList();
    }

    private StockMovement findMovementOrThrow(Long id) {
        return stockMovementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock movement not found with id: " + id));
    }
}