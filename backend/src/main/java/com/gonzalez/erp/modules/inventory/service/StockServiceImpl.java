package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
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
    private final CompanyRepository companyRepository;

    @Override
    public List<StockResponse> findAll() {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return stockRepository.findAll().stream()
                .filter(stock -> stock.getCompany() != null
                        && companyId.equals(stock.getCompany().getId()))
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    public StockResponse findById(Long id) {
        Stock stock = findStockOrThrow(id);
        return StockMapper.toResponse(stock);
    }

    @Override
    public StockResponse findByProductIdAndBranchId(Long productId, Long branchId) {
        validateProductBelongsToCurrentCompany(productId);
        validateBranchBelongsToCurrentCompany(branchId);

        Stock stock = stockRepository.findByProductIdAndBranchId(productId, branchId)
                .filter(s -> belongsToCurrentCompany(s))
                .orElseThrow(() ->
                        new StockNotFoundException(productId.toString(), branchId));

        return StockMapper.toResponse(stock);
    }

    @Override
    public List<StockResponse> findByBranchId(Long branchId) {
        validateBranchBelongsToCurrentCompany(branchId);

        return stockRepository.findByBranchId(branchId).stream()
                .filter(this::belongsToCurrentCompany)
                .map(StockMapper::toResponse)
                .toList();
    }

    @Override
    public List<StockResponse> findByProductId(Long productId) {
        validateProductBelongsToCurrentCompany(productId);

        return stockRepository.findByProductId(productId).stream()
                .filter(this::belongsToCurrentCompany)
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
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return stockRepository.findById(id)
                .filter(stock -> stock.getCompany() != null
                        && companyId.equals(stock.getCompany().getId()))
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
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        validateProductBelongsToCurrentCompany(request.productId());
        validateBranchBelongsToCurrentCompany(request.branchId());

        Company company = companyRepository.getReferenceById(companyId);

        Stock stock = Stock.builder()
                .product(productRepository.getReferenceById(request.productId()))
                .branch(branchRepository.getReferenceById(request.branchId()))
                .quantity(0)
                .company(company)
                .build();

        return stockRepository.save(stock);
    }

    private boolean belongsToCurrentCompany(Stock stock) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return stock.getCompany() != null
                && companyId.equals(stock.getCompany().getId());
    }

    private void validateProductBelongsToCurrentCompany(Long productId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        productRepository.findById(productId)
                .filter(product -> product.getCompany() != null
                        && companyId.equals(product.getCompany().getId()))
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Product not found with id: " + productId));
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
