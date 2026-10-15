package com.gonzalez.erp.modules.transfers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.InsufficientStockException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.transfers.dto.request.StockTransferItemRequest;
import com.gonzalez.erp.modules.transfers.dto.request.StockTransferRequest;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferItemResponse;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import com.gonzalez.erp.modules.transfers.entity.StockTransfer;
import com.gonzalez.erp.modules.transfers.entity.StockTransferItem;
import com.gonzalez.erp.modules.transfers.entity.StockTransferStatus;
import com.gonzalez.erp.modules.transfers.exception.InvalidStockTransferException;
import com.gonzalez.erp.modules.transfers.repository.StockTransferItemRepository;
import com.gonzalez.erp.modules.transfers.repository.StockTransferRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockTransferServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long USER_ID = 7L;
    private static final Long ORIGIN_ID = 10L;
    private static final Long DESTINATION_ID = 11L;
    private static final Long VARIANT_ID = 30L;
    private static final Long TRANSFER_ID = 500L;
    private static final String REFERENCE_TYPE = "STOCK_TRANSFER";

    @Mock private StockTransferRepository stockTransferRepository;
    @Mock private StockTransferItemRepository stockTransferItemRepository;
    @Mock private StockRepository stockRepository;
    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private UserRepository userRepository;
    @Mock private CompanyRepository companyRepository;

    @InjectMocks private StockTransferServiceImpl stockTransferService;

    private Company company;
    private User user;
    private Branch origin;
    private Branch destination;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        user = User.builder()
                .username("deposito")
                .email("deposito@acme.com")
                .password("x")
                .company(company)
                .build();
        user.setId(USER_ID);
        origin = Branch.builder().name("Centro").company(company).build();
        origin.setId(ORIGIN_ID);
        destination = Branch.builder().name("Norte").company(company).build();
        destination.setId(DESTINATION_ID);
        Product product = Product.builder().name("Remera").company(company).build();
        product.setId(20L);
        variant = ProductVariant.builder().sku("REM-M").product(product).company(company).build();
        variant.setId(VARIANT_ID);

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createRejectsSameOriginAndDestination() {
        StockTransferRequest request = new StockTransferRequest(
                ORIGIN_ID, ORIGIN_ID, List.of(new StockTransferItemRequest(VARIANT_ID, 1)));

        assertThatThrownBy(() -> stockTransferService.create(request))
                .isInstanceOf(InvalidStockTransferException.class);
        verify(stockTransferRepository, never()).saveAndFlush(any());
    }

    @Test
    void createRejectsDuplicateVariants() {
        StockTransferRequest request = new StockTransferRequest(ORIGIN_ID, DESTINATION_ID, List.of(
                new StockTransferItemRequest(VARIANT_ID, 1),
                new StockTransferItemRequest(VARIANT_ID, 2)));

        assertThatThrownBy(() -> stockTransferService.create(request))
                .isInstanceOf(InvalidStockTransferException.class);
        verify(stockTransferRepository, never()).saveAndFlush(any());
    }

    @Test
    void createMovesStockFromOriginToDestination() {
        Stock originStock = stock(100L, origin, 8);
        Stock destinationStock = stock(101L, destination, 0);
        stubCreate(originStock, destinationStock);

        StockTransferResponse response = stockTransferService.create(request(5));

        assertThat(originStock.getQuantity()).isEqualTo(3);
        assertThat(destinationStock.getQuantity()).isEqualTo(5);
        assertThat(response.status()).isEqualTo(StockTransferStatus.CONFIRMED);
        assertThat(response.items())
                .extracting(StockTransferItemResponse::productVariantId, StockTransferItemResponse::quantity)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(VARIANT_ID, 5));
        verify(stockMovementRepository, times(2)).save(any(StockMovement.class));
    }

    @Test
    void createFailsWithoutEnoughStockInOrigin() {
        Stock originStock = stock(100L, origin, 2);
        Stock destinationStock = stock(101L, destination, 0);
        stubCreate(originStock, destinationStock);

        assertThatThrownBy(() -> stockTransferService.create(request(5)))
                .isInstanceOf(InsufficientStockException.class);
        assertThat(originStock.getQuantity()).isEqualTo(2);
        verify(stockRepository, never()).save(any());
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    void cancelRejectsAnAlreadyCancelledTransfer() {
        StockTransfer transfer = transfer(StockTransferStatus.CANCELLED, 5);
        when(stockTransferRepository.findByIdAndCompanyIdForUpdate(TRANSFER_ID, COMPANY_ID))
                .thenReturn(Optional.of(transfer));

        assertThatThrownBy(() -> stockTransferService.cancel(TRANSFER_ID))
                .isInstanceOf(InvalidStockTransferException.class);
        verify(stockRepository, never()).save(any());
    }

    @Test
    void cancelFailsWhenDestinationNoLongerHasTheStock() {
        StockTransfer transfer = transfer(StockTransferStatus.CONFIRMED, 5);
        Stock originStock = stock(100L, origin, 3);
        Stock destinationStock = stock(101L, destination, 2);
        stubCancel(transfer, originStock, destinationStock);

        assertThatThrownBy(() -> stockTransferService.cancel(TRANSFER_ID))
                .isInstanceOf(InsufficientStockException.class);
        assertThat(transfer.getStatus()).isEqualTo(StockTransferStatus.CONFIRMED);
        verify(stockRepository, never()).save(any());
    }

    @Test
    void cancelRestoresStockAndMarksTheTransferCancelled() {
        StockTransfer transfer = transfer(StockTransferStatus.CONFIRMED, 5);
        Stock originStock = stock(100L, origin, 3);
        Stock destinationStock = stock(101L, destination, 5);
        stubCancel(transfer, originStock, destinationStock);

        StockTransferResponse response = stockTransferService.cancel(TRANSFER_ID);

        assertThat(originStock.getQuantity()).isEqualTo(8);
        assertThat(destinationStock.getQuantity()).isZero();
        assertThat(response.status()).isEqualTo(StockTransferStatus.CANCELLED);
        verify(stockMovementRepository, times(2)).save(any(StockMovement.class));
    }

    @Test
    void findAllAttachesEachTransferItsOwnItems() {
        StockTransfer first = transfer(StockTransferStatus.CONFIRMED, 5);
        StockTransfer second = transfer(StockTransferStatus.CANCELLED, 2);
        second.setId(TRANSFER_ID + 1);
        Pageable pageable = PageRequest.of(0, 20);
        when(stockTransferRepository.findAllByCompanyId(COMPANY_ID, pageable))
                .thenReturn(new PageImpl<>(List.of(first, second), pageable, 2));
        when(stockTransferItemRepository.findByTransferIdInWithVariant(anyList()))
                .thenReturn(List.of(first.getItems().get(0), second.getItems().get(0)));

        PageResponse<StockTransferResponse> page = stockTransferService.findAll(pageable);

        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.content()).extracting(response -> response.items().get(0).quantity())
                .containsExactly(5, 2);
    }

    private StockTransferRequest request(int quantity) {
        return new StockTransferRequest(ORIGIN_ID, DESTINATION_ID,
                List.of(new StockTransferItemRequest(VARIANT_ID, quantity)));
    }

    private Stock stock(Long id, Branch branch, int quantity) {
        Stock stock = Stock.builder()
                .productVariant(variant)
                .branch(branch)
                .company(company)
                .quantity(quantity)
                .build();
        stock.setId(id);
        return stock;
    }

    private StockTransfer transfer(StockTransferStatus status, int quantity) {
        StockTransfer transfer = StockTransfer.builder()
                .originBranch(origin)
                .destinationBranch(destination)
                .status(status)
                .createdBy(user)
                .company(company)
                .items(new ArrayList<>())
                .build();
        transfer.setId(TRANSFER_ID);
        StockTransferItem item = StockTransferItem.builder()
                .productVariant(variant)
                .quantity(quantity)
                .build();
        item.setId(TRANSFER_ID * 10);
        transfer.addItem(item);
        return transfer;
    }

    private void stubStocks(Stock originStock, Stock destinationStock) {
        when(stockRepository.findByProductVariantIdAndBranchIdAndCompanyId(VARIANT_ID, ORIGIN_ID, COMPANY_ID))
                .thenReturn(Optional.of(originStock));
        when(stockRepository.findByProductVariantIdAndBranchIdAndCompanyId(VARIANT_ID, DESTINATION_ID, COMPANY_ID))
                .thenReturn(Optional.of(destinationStock));
        when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, ORIGIN_ID, COMPANY_ID))
                .thenReturn(Optional.of(originStock));
        when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, DESTINATION_ID, COMPANY_ID))
                .thenReturn(Optional.of(destinationStock));
    }

    private void stubCreate(Stock originStock, Stock destinationStock) {
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(branchRepository.findByIdAndCompanyId(ORIGIN_ID, COMPANY_ID)).thenReturn(Optional.of(origin));
        when(branchRepository.findByIdAndCompanyId(DESTINATION_ID, COMPANY_ID)).thenReturn(Optional.of(destination));
        when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
        when(productVariantRepository.findByIdWithProductAndCompany(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(stockTransferRepository.saveAndFlush(any(StockTransfer.class))).thenAnswer(invocation -> {
            StockTransfer saved = invocation.getArgument(0);
            saved.setId(TRANSFER_ID);
            return saved;
        });
        stubStocks(originStock, destinationStock);
    }

    private void stubCancel(StockTransfer transfer, Stock originStock, Stock destinationStock) {
        int quantity = transfer.getItems().get(0).getQuantity();
        when(stockTransferRepository.findByIdAndCompanyIdForUpdate(TRANSFER_ID, COMPANY_ID))
                .thenReturn(Optional.of(transfer));
        when(branchRepository.findByIdAndCompanyId(ORIGIN_ID, COMPANY_ID)).thenReturn(Optional.of(origin));
        when(branchRepository.findByIdAndCompanyId(DESTINATION_ID, COMPANY_ID)).thenReturn(Optional.of(destination));
        when(productVariantRepository.findByIdWithProductAndCompany(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(stockMovementRepository.findByReferenceAndCompanyId(TRANSFER_ID, REFERENCE_TYPE, COMPANY_ID))
                .thenReturn(List.of(
                        StockMovement.builder().stock(originStock)
                                .type(StockMovementType.TRANSFER_OUT).quantity(-quantity).build(),
                        StockMovement.builder().stock(destinationStock)
                                .type(StockMovementType.TRANSFER_IN).quantity(quantity).build()));
        stubStocks(originStock, destinationStock);
    }
}
