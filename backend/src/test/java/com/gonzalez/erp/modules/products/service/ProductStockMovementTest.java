package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchAccessDeniedException;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.inventory.service.StockService;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantStockRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantUpdateRequest;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.exception.InvalidProductVariantsException;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Movimientos que deja la edición del stock desde el producto. */
@ExtendWith(MockitoExtension.class)
class ProductStockMovementTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long PRODUCT_ID = 20L;
    private static final Long CATEGORY_ID = 30L;
    private static final Long VARIANT_ID = 40L;
    private static final Long CENTRO_ID = 10L;
    private static final Long NORTE_ID = 11L;

    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private ProductAttributeValueRepository attributeValueRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private BranchAccessService branchAccessService;
    @Mock private CompanyRepository companyRepository;
    @Mock private StockRepository stockRepository;
    @Mock private StockService stockService;
    @Mock private StockMovementRecorder stockMovementRecorder;

    @InjectMocks private ProductServiceImpl productService;

    private Company company;
    private Product product;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        User user = User.builder()
                .username("admin")
                .email("admin@acme.com")
                .password("x")
                .company(company)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));

        Category category = Category.builder().name("Ropa").company(company).build();
        category.setId(CATEGORY_ID);
        product = Product.builder().name("Remera").category(category).company(company).build();
        product.setId(PRODUCT_ID);
        variant = ProductVariant.builder()
                .sku("REM-M")
                .price(BigDecimal.TEN)
                .product(product)
                .company(company)
                .build();
        variant.setId(VARIANT_ID);

        when(productRepository.findByIdAndCompanyId(PRODUCT_ID, COMPANY_ID)).thenReturn(Optional.of(product));
        when(categoryRepository.findByIdAndCompanyId(CATEGORY_ID, COMPANY_ID)).thenReturn(Optional.of(category));
        when(variantRepository.findByProductId(PRODUCT_ID)).thenReturn(List.of(variant));
        when(variantRepository.saveAndFlush(variant)).thenReturn(variant);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void onlyTheBranchesWhoseQuantityChangedGetAMovement() {
        Stock centro = stockIn(CENTRO_ID, 5);
        Stock norte = stockIn(NORTE_ID, 3);

        productService.update(PRODUCT_ID, request(
                new ProductVariantStockRequest(CENTRO_ID, 0),
                new ProductVariantStockRequest(NORTE_ID, 3)));

        assertThat(centro.getQuantity()).isZero();
        verify(stockMovementRecorder).record(centro, StockMovementType.ADJUSTMENT, -5, 5, null,
                StockMovementRecorder.PRODUCT_UPDATE, PRODUCT_ID);
        verify(stockMovementRecorder, never()).record(eq(norte), any(), anyInt(), anyInt(), any(), any(), any());
    }

    @Test
    void repeatedBranchInTheStockIsAnInvalidRequest() {
        stockIn(CENTRO_ID, 5);

        // Antes era IllegalArgumentException y el handler lo devolvía como 500.
        assertThatThrownBy(() -> productService.update(PRODUCT_ID, request(
                new ProductVariantStockRequest(CENTRO_ID, 1),
                new ProductVariantStockRequest(CENTRO_ID, 2))))
                .isInstanceOf(InvalidProductVariantsException.class);
    }

    @Test
    void changingTheStockOfABranchTheUserCannotAccessIsForbidden() {
        Stock norte = stockIn(NORTE_ID, 3);
        doThrow(new BranchAccessDeniedException(NORTE_ID)).when(branchAccessService).requireAccessible(norte.getBranch());

        assertThatThrownBy(() -> productService.update(PRODUCT_ID, request(
                new ProductVariantStockRequest(NORTE_ID, 7))))
                .isInstanceOf(BranchAccessDeniedException.class);
        assertThat(norte.getQuantity()).isEqualTo(3);
        verify(stockMovementRecorder, never()).record(any(), any(), anyInt(), anyInt(), any(), any(), any());
    }

    @Test
    void resendingTheSameQuantityDoesNotRequireAccessToTheBranch() {
        // La edición reenvía todas las sucursales: solo se chequea donde la cantidad cambia.
        Stock centro = stockIn(CENTRO_ID, 5);
        Stock norte = stockIn(NORTE_ID, 3);

        productService.update(PRODUCT_ID, request(
                new ProductVariantStockRequest(CENTRO_ID, 4),
                new ProductVariantStockRequest(NORTE_ID, 3)));

        verify(branchAccessService).requireAccessible(centro.getBranch());
        verify(branchAccessService, never()).requireAccessible(norte.getBranch());
    }

    private Stock stockIn(Long branchId, int quantity) {
        Branch branch = Branch.builder().name("Sucursal " + branchId).company(company).build();
        branch.setId(branchId);
        Stock stock = Stock.builder().productVariant(variant).branch(branch).quantity(quantity).build();
        stock.setId(100L + branchId);
        when(branchRepository.findByIdAndCompanyId(branchId, COMPANY_ID)).thenReturn(Optional.of(branch));
        when(stockRepository.findByProductVariantIdAndBranchIdForUpdate(VARIANT_ID, branchId, COMPANY_ID))
                .thenReturn(Optional.of(stock));
        return stock;
    }

    private ProductUpdateRequest request(ProductVariantStockRequest... stock) {
        return new ProductUpdateRequest("Remera", null, CATEGORY_ID, List.of(
                new ProductVariantUpdateRequest("REM-M", BigDecimal.TEN, List.of(), List.of(stock))));
    }
}
