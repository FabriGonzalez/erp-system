package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
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
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockServiceImpl implements StockService {

    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductVariantRepository productVariantRepository;
    private final BranchRepository branchRepository;

    @Override
    public List<StockResponse> findAll() {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return stockRepository.findAllByCompanyId(companyId).stream()
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    public StockResponse findById(Long id) {
        Stock stock = findStockOrThrow(id);
        return StockMapper.toResponse(stock);
    }

    @Override
    public StockResponse findByProductVariantIdAndBranchId(Long productVariantId, Long branchId) {
        validateProductVariantBelongsToCurrentCompany(productVariantId);
        validateBranchBelongsToCurrentCompany(branchId);

        Stock stock = stockRepository.findByProductVariantIdAndBranchIdAndCompanyId(
                        productVariantId, branchId, SecurityUtils.requireCurrentCompanyId())
                .orElseThrow(() ->
                        new StockNotFoundException(productVariantId.toString(), branchId));

        return StockMapper.toResponse(stock);
    }

    @Override
    public List<StockResponse> findByBranchId(Long branchId) {
        validateBranchBelongsToCurrentCompany(branchId);

        return stockRepository.findByBranchIdAndCompanyId(
                        branchId, SecurityUtils.requireCurrentCompanyId()).stream()
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    public List<StockResponse> findByProductVariantId(Long productVariantId) {
        validateProductVariantBelongsToCurrentCompany(productVariantId);

        return stockRepository.findByProductVariantIdAndCompanyId(
                        productVariantId, SecurityUtils.requireCurrentCompanyId()).stream()
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public StockResponse adjustStock(StockAdjustRequest request) {
        checkAdjustStockPermission();

        Long companyId = SecurityUtils.requireCurrentCompanyId();
        validateProductVariantBelongsToCurrentCompany(request.productVariantId());
        validateBranchBelongsToCurrentCompany(request.branchId());

        stockRepository.insertIfAbsent(
                request.productVariantId(),
                request.branchId(),
                companyId);

        Stock stock = stockRepository.findByProductVariantIdAndBranchIdForUpdate(
                        request.productVariantId(), request.branchId(), companyId)
                .orElseThrow(() -> new StockNotFoundException(
                        request.productVariantId().toString(), request.branchId()));

        Integer previousQuantity = stock.getQuantity();
        Integer newQuantity = request.newQuantity();

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
                return stockRepository.findByIdAndCompanyId(id, SecurityUtils.requireCurrentCompanyId())
                .orElseThrow(() -> new StockNotFoundException(id));
    }

        private void checkAdjustStockPermission() {
                if (!SecurityUtils.getCurrentUserDetails().getPermissions().contains(
                                com.gonzalez.erp.modules.roles.entity.Permission.AJUSTAR_STOCK)) {
                        throw new AccessDeniedException(
                                        "You do not have permission to adjust stock");
        }
    }

    private void validateProductVariantBelongsToCurrentCompany(Long variantId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        productVariantRepository.findById(variantId)
                .filter(variant -> variant.getCompany() != null
                        && companyId.equals(variant.getCompany().getId()))
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product variant not found with id: " + variantId));
    }

    private void validateBranchBelongsToCurrentCompany(Long branchId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        branchRepository.findById(branchId)
                .filter(branch -> branch.getCompany() != null
                        && companyId.equals(branch.getCompany().getId()))
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Branch not found with id: " + branchId));
    }
}
