package com.gonzalez.erp.modules.transfers.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.InsufficientStockException;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.transfers.dto.request.StockTransferItemRequest;
import com.gonzalez.erp.modules.transfers.dto.request.StockTransferRequest;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import com.gonzalez.erp.modules.transfers.entity.StockTransfer;
import com.gonzalez.erp.modules.transfers.entity.StockTransferItem;
import com.gonzalez.erp.modules.transfers.entity.StockTransferStatus;
import com.gonzalez.erp.modules.transfers.exception.InvalidStockTransferException;
import com.gonzalez.erp.modules.transfers.mapper.StockTransferMapper;
import com.gonzalez.erp.modules.transfers.repository.StockTransferRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockTransferServiceImpl implements StockTransferService {

    private static final String REFERENCE_TYPE = "STOCK_TRANSFER";

    private final StockTransferRepository stockTransferRepository;
    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final BranchRepository branchRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    @Override
    public List<StockTransferResponse> findAll(StockTransferStatus status) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        List<StockTransfer> transfers = (status != null)
                ? stockTransferRepository.findByStatus(status)
                : stockTransferRepository.findAll();

        return transfers.stream()
                .filter(transfer -> transfer.getCompany() != null
                        && companyId.equals(transfer.getCompany().getId()))
                .map(StockTransferMapper::toResponse)
                .toList();
    }

    @Override
    public StockTransferResponse findById(Long id) {
        StockTransfer transfer = findTransferOrThrow(id);
        return StockTransferMapper.toResponse(transfer);
    }

    @Override
    @Transactional
    public StockTransferResponse create(StockTransferRequest request) {
        if (request.originBranchId().equals(request.destinationBranchId())) {
            throw new InvalidStockTransferException(
                    "Origin and destination branches must be different");
        }

        Set<Long> seenVariants = new HashSet<>();
        for (StockTransferItemRequest item : request.items()) {
            if (!seenVariants.add(item.productVariantId())) {
                throw new InvalidStockTransferException(
                        "Duplicate variant in transfer items: " + item.productVariantId());
            }
        }

        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Company company = companyRepository.getReferenceById(companyId);

        StockTransfer transfer = StockTransfer.builder()
                .originBranch(branchRepository.getReferenceById(request.originBranchId()))
                .destinationBranch(branchRepository.getReferenceById(request.destinationBranchId()))
                .status(StockTransferStatus.DRAFT)
                .createdBy(userRepository.getReferenceById(getCurrentUserId()))
                .company(company)
                .items(new ArrayList<>())
                .build();

        for (StockTransferItemRequest itemRequest : request.items()) {
            StockTransferItem item = StockTransferItem.builder()
                    .transfer(transfer)
                    .productVariant(productVariantRepository.getReferenceById(itemRequest.productVariantId()))
                    .quantity(itemRequest.quantity())
                    .build();
            transfer.getItems().add(item);
        }

        StockTransfer saved = stockTransferRepository.saveAndFlush(transfer);
        return StockTransferMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public StockTransferResponse confirm(Long id) {
        StockTransfer transfer = findTransferOrThrow(id);

        checkStatus(transfer, StockTransferStatus.DRAFT, "confirmed");

        for (StockTransferItem item : transfer.getItems()) {
            Long variantId = item.getProductVariant().getId();
            Long originBranchId = transfer.getOriginBranch().getId();
            Long destinationBranchId = transfer.getDestinationBranch().getId();

            Stock originStock = stockRepository
                    .findByProductVariantIdAndBranchId(variantId, originBranchId)
                    .orElseThrow(() -> new StockNotFoundException(variantId.toString(), originBranchId));

            if (originStock.getQuantity() < item.getQuantity()) {
                throw new InsufficientStockException(
                        originStock.getId(), originStock.getQuantity(), item.getQuantity());
            }

            int originPrevious = originStock.getQuantity();
            originStock.setQuantity(originPrevious - item.getQuantity());
            stockRepository.save(originStock);

            Stock destinationStock = stockRepository
                    .findByProductVariantIdAndBranchId(variantId, destinationBranchId)
                    .orElseGet(() -> createStock(variantId, destinationBranchId));

            int destinationPrevious = destinationStock.getQuantity();
            destinationStock.setQuantity(destinationPrevious + item.getQuantity());
            stockRepository.save(destinationStock);

            stockMovementRepository.save(StockMovement.builder()
                    .stock(originStock)
                    .type(StockMovementType.TRANSFER_OUT)
                    .quantity(-item.getQuantity())
                    .previousQuantity(originPrevious)
                    .newQuantity(originStock.getQuantity())
                    .reason(null)
                    .referenceId(transfer.getId())
                    .referenceType(REFERENCE_TYPE)
                    .build());

            stockMovementRepository.save(StockMovement.builder()
                    .stock(destinationStock)
                    .type(StockMovementType.TRANSFER_IN)
                    .quantity(item.getQuantity())
                    .previousQuantity(destinationPrevious)
                    .newQuantity(destinationStock.getQuantity())
                    .reason(null)
                    .referenceId(transfer.getId())
                    .referenceType(REFERENCE_TYPE)
                    .build());
        }

        transfer.confirm();
        return StockTransferMapper.toResponse(transfer);
    }

    @Override
    @Transactional
    public StockTransferResponse cancel(Long id) {
        StockTransfer transfer = findTransferOrThrow(id);

        checkStatus(transfer, StockTransferStatus.DRAFT, "cancelled");

        transfer.cancel();
        return StockTransferMapper.toResponse(transfer);
    }

    private StockTransfer findTransferOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return stockTransferRepository.findById(id)
                .filter(transfer -> transfer.getCompany() != null
                        && companyId.equals(transfer.getCompany().getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Stock transfer not found with id: " + id));
    }

    private void checkStatus(StockTransfer transfer, StockTransferStatus expected, String action) {
        if (transfer.getStatus() != expected) {
            throw new InvalidStockTransferException(
                    "Only " + expected + " transfers can be " + action
                            + ". Current status: " + transfer.getStatus());
        }
    }

    private Long getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResourceNotFoundException("No authenticated user found");
        }

        return userDetails.getUserId();
    }

    private Stock createStock(Long variantId, Long branchId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Company company = companyRepository.getReferenceById(companyId);

        Stock stock = Stock.builder()
                .productVariant(productVariantRepository.getReferenceById(variantId))
                .branch(branchRepository.getReferenceById(branchId))
                .quantity(0)
                .company(company)
                .build();

        return stockRepository.save(stock);
    }
}
