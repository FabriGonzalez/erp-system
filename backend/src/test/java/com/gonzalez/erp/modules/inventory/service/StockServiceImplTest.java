package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.EnumSet;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long BRANCH_ID = 10L;
    private static final Long PRODUCT_ID = 20L;
    private static final Long VARIANT_ID = 40L;

    @Mock private StockRepository stockRepository;
    @Mock private StockMovementRecorder stockMovementRecorder;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private BranchRepository branchRepository;

    @InjectMocks private StockServiceImpl stockService;

    private Branch branch;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        Role role = Role.builder()
                .name("Depósito")
                .code("DEPOSITO")
                .company(company)
                .permissions(EnumSet.of(Permission.AJUSTAR_STOCK))
                .build();
        User user = User.builder()
                .username("deposito")
                .email("deposito@acme.com")
                .password("x")
                .company(company)
                .role(role)
                .build();
        user.setId(7L);
        branch = Branch.builder().name("Centro").company(company).build();
        branch.setId(BRANCH_ID);
        Product product = Product.builder().name("Remera").company(company).build();
        product.setId(PRODUCT_ID);
        variant = ProductVariant.builder().sku("REM-M").product(product).company(company).build();
        variant.setId(VARIANT_ID);

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));

        when(productVariantRepository.findById(VARIANT_ID)).thenReturn(Optional.of(variant));
        when(branchRepository.findById(BRANCH_ID)).thenReturn(Optional.of(branch));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void adjustRecordsTheDeltaAndTheReason() {
        Stock stock = stock(8);
        when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, BRANCH_ID, COMPANY_ID))
                .thenReturn(Optional.of(stock));

        stockService.adjustStock(new StockAdjustRequest(VARIANT_ID, BRANCH_ID, 5, "Rotura"));

        verify(stockMovementRecorder).record(stock, StockMovementType.ADJUSTMENT, -3, 8, "Rotura", null, null);
    }

    @Test
    void initialStockIsRecordedAsProductCreation() {
        Stock stock = stock(0);
        when(stockRepository.insertIfAbsent(VARIANT_ID, BRANCH_ID, COMPANY_ID)).thenReturn(1);
        when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, BRANCH_ID, COMPANY_ID))
                .thenReturn(Optional.of(stock));

        stockService.createInitialStock(VARIANT_ID, BRANCH_ID, 6);

        verify(stockMovementRecorder).record(stock, StockMovementType.ADJUSTMENT, 6, 0, null,
                StockMovementRecorder.PRODUCT_CREATION, PRODUCT_ID);
    }

    @Test
    void initialStockOfZeroIsNotAMovement() {
        when(stockRepository.insertIfAbsent(VARIANT_ID, BRANCH_ID, COMPANY_ID)).thenReturn(1);
        when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, BRANCH_ID, COMPANY_ID))
                .thenReturn(Optional.of(stock(0)));

        stockService.createInitialStock(VARIANT_ID, BRANCH_ID, 0);

        verify(stockMovementRecorder, never()).record(any(), any(), anyInt(), anyInt(), any(), any(), any());
    }

    private Stock stock(int quantity) {
        Stock stock = Stock.builder().productVariant(variant).branch(branch).quantity(quantity).build();
        stock.setId(100L);
        return stock;
    }
}
