package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.common.util.SearchText;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;
import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.StockAlreadyExistsException;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.mapper.StockMapper;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockServiceImpl implements StockService {

    private final StockRepository stockRepository;
    private final StockMovementRecorder stockMovementRecorder;
    private final ProductVariantRepository productVariantRepository;
    private final BranchRepository branchRepository;
    private final BranchAccessService branchAccessService;

    @Override
    public PageResponse<StockResponse> search(Long branchId, String query, List<Long> variantIds,
                                              Pageable pageable) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        if (branchId != null) {
            validateBranchBelongsToCurrentCompany(branchId);
        }
        String search = SearchText.normalize(query);
        boolean filterVariants = variantIds != null && !variantIds.isEmpty();

        // El stock es legible en toda la empresa (etapa 13): no se filtra por asignación.
        Page<Stock> stocks = stockRepository.search(
                companyId,
                branchId,
                filterVariants,
                // IN con una lista vacía no es SQL válido; con filterVariants = false no se usa.
                filterVariants ? variantIds : List.of(-1L),
                search != null,
                SearchText.containsPattern(search),
                pageable);
        return PageResponse.of(stocks, StockMapper::toResponse);
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
    public void createInitialStock(Long productVariantId, Long branchId, Integer quantity) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        ProductVariant variant = validateProductVariantBelongsToCurrentCompany(productVariantId);
        // Un stock inicial en 0 no cambia nada: solo se exige acceso a la sucursal si carga cantidad.
        if (quantity > 0) {
            branchAccessService.requireAccessible(branchId);
        } else {
            validateBranchBelongsToCurrentCompany(branchId);
        }

        int inserted = stockRepository.insertIfAbsent(
                productVariantId,
                branchId,
                companyId
        );

        if (inserted == 0) {
            throw new StockAlreadyExistsException(
                    productVariantId.toString(),
                    branchId
            );
        }

        Stock stock = stockRepository.findByProductVariantIdAndBranchIdForUpdate(
                        productVariantId,
                        branchId,
                        companyId
                )
                .orElseThrow(() -> new StockNotFoundException(
                        productVariantId.toString(),
                        branchId
                ));

        stock.setQuantity(quantity);
        stockRepository.save(stock);

        // El registro nace en 0: un stock inicial en 0 no es un movimiento.
        if (quantity > 0) {
            stockMovementRecorder.record(stock, StockMovementType.ADJUSTMENT, quantity, 0, null,
                    StockMovementRecorder.PRODUCT_CREATION, variant.getProduct().getId());
        }
    }

    @Override
    @Transactional
    public StockResponse adjustStock(StockAdjustRequest request) {
        checkAdjustStockPermission();

        Long companyId = SecurityUtils.requireCurrentCompanyId();
        validateProductVariantBelongsToCurrentCompany(request.productVariantId());
        branchAccessService.requireAccessible(request.branchId());

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

        stockMovementRecorder.record(stock, StockMovementType.ADJUSTMENT, delta, previousQuantity,
                request.reason(), null, null);

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

    private ProductVariant validateProductVariantBelongsToCurrentCompany(Long variantId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return productVariantRepository.findById(variantId)
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
