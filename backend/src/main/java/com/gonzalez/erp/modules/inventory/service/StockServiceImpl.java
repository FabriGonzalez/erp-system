package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;
import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.mapper.StockMapper;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;


@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockServiceImpl implements StockService {

    private static final String ADMIN_ROLE = "ADMIN";


    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;

    @Override
    public List<StockResponse> findAll() {
        return stockRepository.findAll().stream()
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    public StockResponse findById(Long id) {
        Stock stock = findStockOrThrow(id);
        return StockMapper.toResponse(stock);
    }

    @Override
    public StockResponse findByProductIdAndBranchId(String productId, Long branchId) {
        Stock stock = stockRepository.findByProductIdAndBranchId(productId, branchId)
                .orElseThrow(() -> new StockNotFoundException(productId, branchId));
        return StockMapper.toResponse(stock);
    }

    @Override
    public List<StockResponse> findByBranchId(Long branchId) {
        return stockRepository.findByBranchId(branchId).stream()
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    public List<StockResponse> findByProductId(String productId) {
        return stockRepository.findByProductId(productId).stream()
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public StockResponse adjustStock(StockAdjustRequest request) {
        checkAdminRole();

        Stock stock = stockRepository
                .findByProductIdAndBranchId(
                        request.productId(),
                        request.branchId()
                )
                .orElseGet(() -> createStock(request));

        Integer previousQuantity = stock.getQuantity();
        Integer newQuantity = request.newQuantity();

        if (newQuantity < 0) {
            throw new IllegalArgumentException(
                    "Stock quantity cannot be negative"
            );
        }

        int delta = newQuantity - previousQuantity;

        stock.setQuantity(newQuantity);
        stockRepository.save(stock);

        StockMovement movement = StockMovement.builder()
                .stock(stock)
                .type(StockMovementType.ADJUSTMENT)
                .quantity(delta)
                .previousQuantity(previousQuantity)
                .newQuantity(newQuantity)
                .reason(request.reason())
                .referenceId(null)
                .referenceType(null)
                .build();

        stockMovementRepository.save(movement);

        return StockMapper.toResponse(stock);
    }

    private Stock findStockOrThrow(Long id) {
        return stockRepository.findById(id)
                .orElseThrow(() -> new StockNotFoundException(id));
    }

    private void checkAdminRole() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResourceNotFoundException(
                    "No authenticated user found");
        }

        var userDetails = (CustomUserDetails) authentication.getPrincipal();

        if (!ADMIN_ROLE.equals(userDetails.getRoleCode())) {
            throw new ResourceNotFoundException(
                    "Only administrators can perform stock adjustments");
        }
    }

    private Stock createStock(StockAdjustRequest request) {

        Stock stock = Stock.builder()
                .product(productRepository.getReferenceById(request.productId()))
                .branch(branchRepository.getReferenceById(request.branchId()))
                .quantity(0)
                .build();

        return stockRepository.save(stock);
    }

}