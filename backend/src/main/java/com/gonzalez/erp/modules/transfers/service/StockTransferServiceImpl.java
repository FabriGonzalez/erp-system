package com.gonzalez.erp.modules.transfers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.InsufficientStockException;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
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
import com.gonzalez.erp.modules.transfers.repository.StockTransferItemRepository;
import com.gonzalez.erp.modules.transfers.repository.StockTransferRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.time.Instant;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockTransferServiceImpl implements StockTransferService {

    private static final String REFERENCE_TYPE = "STOCK_TRANSFER";

    private final StockTransferRepository stockTransferRepository;
    private final StockTransferItemRepository stockTransferItemRepository;
    private final StockRepository stockRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockMovementRecorder stockMovementRecorder;
    private final BranchRepository branchRepository;
    private final BranchAccessService branchAccessService;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    @Override
    public PageResponse<StockTransferResponse> findAll(Pageable pageable) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<Long> branchIds = branchAccessService.accessibleBranchIds();
        if (branchIds.isEmpty()) {
            return new PageResponse<>(List.of(), pageable.getPageNumber(), pageable.getPageSize(), 0, 0);
        }
        Page<StockTransfer> transfers = stockTransferRepository.findAllByCompanyIdAndBranchIds(
                companyId, branchIds, pageable);

        List<Long> transferIds = transfers.getContent().stream().map(StockTransfer::getId).toList();
        Map<Long, List<StockTransferItem>> itemsByTransfer = transferIds.isEmpty()
                ? Map.of()
                : stockTransferItemRepository.findByTransferIdInWithVariant(transferIds).stream()
                        .collect(Collectors.groupingBy(item -> item.getTransfer().getId()));

        return PageResponse.of(transfers, transfer -> StockTransferMapper.toResponse(
                transfer, itemsByTransfer.getOrDefault(transfer.getId(), List.of())));
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

        // Se envía desde una sucursal propia hacia cualquier sucursal activa de la empresa.
        var originBranch = branchAccessService.requireAccessible(request.originBranchId());
        var destinationBranch = branchAccessService.requireActive(request.destinationBranchId());

        StockTransfer transfer = StockTransfer.builder()
            .originBranch(originBranch)
            .destinationBranch(destinationBranch)
            .status(StockTransferStatus.CONFIRMED)
            .confirmedAt(Instant.now())
            .createdBy(userRepository.getReferenceById(getCurrentUserId()))
            .company(company)
            .items(new ArrayList<>())
            .build();

        for (StockTransferItemRequest itemRequest : request.items()) {
            ProductVariant productVariant = productVariantRepository
                .findByIdWithProductAndCompany(itemRequest.productVariantId())
                .filter(variant -> variant.getCompany() != null
                    && companyId.equals(variant.getCompany().getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Product variant not found with id: " + itemRequest.productVariantId()));

            StockTransferItem item = StockTransferItem.builder()
                .transfer(transfer)
                .productVariant(productVariant)
                .quantity(itemRequest.quantity())
                .build();
            transfer.getItems().add(item);
        }

        StockTransfer saved = stockTransferRepository.saveAndFlush(transfer);
        applyTransferStock(saved, companyId);
        return StockTransferMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public StockTransferResponse cancel(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        StockTransfer transfer = stockTransferRepository.findByIdAndCompanyIdForUpdate(id, companyId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Stock transfer not found with id: " + id));

        checkStatus(transfer, StockTransferStatus.CONFIRMED, "cancelled");
        validateTransferReferences(transfer, companyId);

        Long originBranchId = transfer.getOriginBranch().getId();
        Long destinationBranchId = transfer.getDestinationBranch().getId();
        Map<StockKey, Stock> lockedStocks = lockTransferStocks(
                transfer, originBranchId, destinationBranchId, companyId);
        List<StockMovement> originalMovements = stockMovementRepository
                .findByReferenceAndCompanyId(transfer.getId(), REFERENCE_TYPE, companyId);

        for (StockTransferItem item : transfer.getItems()) {
            Long variantId = item.getProductVariant().getId();
            Stock originStock = lockedStocks.get(new StockKey(variantId, originBranchId));
            Stock destinationStock = lockedStocks.get(new StockKey(variantId, destinationBranchId));
            StockMovement originMovement = findMovement(
                    originalMovements, originStock.getId(), StockMovementType.TRANSFER_OUT);
            StockMovement destinationMovement = findMovement(
                    originalMovements, destinationStock.getId(), StockMovementType.TRANSFER_IN);

            validateOriginalMovements(item, originMovement, destinationMovement);
            if (destinationStock.getQuantity() < item.getQuantity()) {
                throw new InsufficientStockException(
                        destinationStock.getId(), destinationStock.getQuantity(), item.getQuantity());
            }

            int originPrevious = originStock.getQuantity();
            int destinationPrevious = destinationStock.getQuantity();

            originStock.setQuantity(originPrevious + item.getQuantity());
            destinationStock.setQuantity(destinationPrevious - item.getQuantity());
            stockRepository.save(originStock);
            stockRepository.save(destinationStock);

            // La anulación registra el inverso: el origen recibe y el destino entrega.
            saveMovement(originStock, StockMovementType.TRANSFER_IN,
                    item.getQuantity(), originPrevious, transfer);
            saveMovement(destinationStock, StockMovementType.TRANSFER_OUT,
                    -item.getQuantity(), destinationPrevious, transfer);
        }

        transfer.cancel();
        return StockTransferMapper.toResponse(transfer);
    }

    private void applyTransferStock(StockTransfer transfer, Long companyId) {
        Long originBranchId = transfer.getOriginBranch().getId();
        Long destinationBranchId = transfer.getDestinationBranch().getId();

        for (StockTransferItem item : transfer.getItems()) {
            stockRepository.insertIfAbsent(
                    item.getProductVariant().getId(), destinationBranchId, companyId);
        }

        Map<StockKey, Stock> lockedStocks = lockTransferStocks(
                transfer, originBranchId, destinationBranchId, companyId);

        for (StockTransferItem item : transfer.getItems()) {
            Stock originStock = lockedStocks.get(new StockKey(
                    item.getProductVariant().getId(), originBranchId));
            if (originStock == null) {
                throw new StockNotFoundException(
                        item.getProductVariant().getId().toString(), originBranchId);
            }
            if (originStock.getQuantity() < item.getQuantity()) {
                throw new InsufficientStockException(
                        originStock.getId(), originStock.getQuantity(), item.getQuantity());
            }
        }

        for (StockTransferItem item : transfer.getItems()) {
            Long variantId = item.getProductVariant().getId();
            Stock originStock = lockedStocks.get(new StockKey(variantId, originBranchId));
            Stock destinationStock = lockedStocks.get(new StockKey(variantId, destinationBranchId));
            int originPrevious = originStock.getQuantity();
            int destinationPrevious = destinationStock.getQuantity();

            originStock.setQuantity(originPrevious - item.getQuantity());
            destinationStock.setQuantity(destinationPrevious + item.getQuantity());
            stockRepository.save(originStock);
            stockRepository.save(destinationStock);
            saveMovement(originStock, StockMovementType.TRANSFER_OUT,
                    -item.getQuantity(), originPrevious, transfer);
            saveMovement(destinationStock, StockMovementType.TRANSFER_IN,
                    item.getQuantity(), destinationPrevious, transfer);
        }
    }

    private StockTransfer findTransferOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        // Mismo criterio que el listado. La anulación no pasa por acá: solo pide TRANSFERIR_STOCK.
        return stockTransferRepository.findByIdAndCompanyId(id, companyId)
                .filter(transfer -> branchAccessService.isAccessible(transfer.getOriginBranch())
                        || branchAccessService.isAccessible(transfer.getDestinationBranch()))
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

    private void validateTransferReferences(StockTransfer transfer, Long companyId) {
        if (branchRepository.findByIdAndCompanyId(transfer.getOriginBranch().getId(), companyId).isEmpty()
                || branchRepository.findByIdAndCompanyId(
                transfer.getDestinationBranch().getId(), companyId).isEmpty()) {
            throw new ResourceNotFoundException("Transfer branches do not belong to the current company");
        }

        for (StockTransferItem item : transfer.getItems()) {
            boolean belongsToCompany = productVariantRepository
                    .findByIdWithProductAndCompany(item.getProductVariant().getId())
                    .map(ProductVariant::getCompany)
                    .map(company -> companyId.equals(company.getId()))
                    .orElse(false);
            if (!belongsToCompany) {
                throw new ResourceNotFoundException(
                        "Product variant not found with id: " + item.getProductVariant().getId());
            }
        }
    }

    private Long getCurrentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResourceNotFoundException("No authenticated user found");
        }

        return userDetails.getUserId();
    }

    private java.util.Optional<Stock> loadStock(Long variantId, Long branchId, Long companyId) {
        return stockRepository.findByProductVariantIdAndBranchIdAndCompanyId(
                variantId, branchId, companyId);
    }

    private Map<StockKey, Stock> lockTransferStocks(StockTransfer transfer, Long originBranchId, Long destinationBranchId, Long companyId) {
        Map<StockKey, Stock> discoveredStocks = new HashMap<>();

        for (StockTransferItem item : transfer.getItems()) {
            Long variantId = item.getProductVariant().getId();
            stockRepository.insertIfAbsent(variantId, destinationBranchId, companyId);

            StockKey originKey = new StockKey(variantId, originBranchId);
            StockKey destinationKey = new StockKey(variantId, destinationBranchId);
            Stock originStock = loadStock(variantId, originBranchId, companyId)
                .orElseThrow(() -> new StockNotFoundException(
                    variantId.toString(), originBranchId));
            Stock destinationStock = loadStock(variantId, destinationBranchId, companyId)
                .orElseThrow(() -> new StockNotFoundException(
                    variantId.toString(), destinationBranchId));
            discoveredStocks.put(originKey, originStock);
            discoveredStocks.put(destinationKey, destinationStock);
        }

        Map<StockKey, Stock> lockedStocks = new HashMap<>();
        discoveredStocks.entrySet().stream()
            .sorted(Comparator
                .comparing((Map.Entry<StockKey, Stock> entry) -> entry.getValue().getId())
                .thenComparing(entry -> entry.getKey().variantId())
                .thenComparing(entry -> entry.getKey().branchId()))
            .forEach(entry -> lockedStocks.put(
                entry.getKey(), lockStock(entry.getKey(), companyId)));
        return lockedStocks;
    }

    private StockMovement findMovement(List<StockMovement> movements, Long stockId, StockMovementType type) {
        List<StockMovement> matchingMovements = movements.stream()
            .filter(movement -> movement.getStock().getId().equals(stockId)
                && movement.getType() == type)
            .toList();
        if (matchingMovements.size() != 1) {
            throw new InvalidStockTransferException(
                "Expected exactly one " + type + " movement for stock " + stockId);
        }
        return matchingMovements.get(0);
    }

    private void validateOriginalMovements(StockTransferItem item, StockMovement originMovement, StockMovement destinationMovement) {
        int quantity = item.getQuantity();
        if (originMovement.getType() != StockMovementType.TRANSFER_OUT
            || originMovement.getQuantity() != -quantity) {
            throw new InvalidStockTransferException(
                "Invalid origin movement for transfer item " + item.getId());
        }
        if (destinationMovement.getType() != StockMovementType.TRANSFER_IN
            || destinationMovement.getQuantity() != quantity) {
            throw new InvalidStockTransferException(
                "Invalid destination movement for transfer item " + item.getId());
        }
        if (originMovement.getStock() == null
            || destinationMovement.getStock() == null
            || originMovement.getStock().getId().equals(destinationMovement.getStock().getId())) {
            throw new InvalidStockTransferException(
                "Transfer movements do not reference distinct stocks");
        }
    }

    private void saveMovement(Stock stock, StockMovementType type, int quantity, int previousQuantity, StockTransfer transfer) {
        stockMovementRecorder.record(stock, type, quantity, previousQuantity, null,
                REFERENCE_TYPE, transfer.getId());
    }

    private Stock lockStock(StockKey key, Long companyId) {
        return stockRepository.findByProductVariantIdAndBranchIdForUpdate(
                        key.variantId(), key.branchId(), companyId)
                .orElseThrow(() -> new StockNotFoundException(
                        key.variantId().toString(), key.branchId()));
    }

    private record StockKey(Long variantId, Long branchId) {
    }
}
