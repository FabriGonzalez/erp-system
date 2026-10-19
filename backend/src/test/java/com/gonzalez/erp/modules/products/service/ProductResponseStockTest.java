package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.inventory.service.StockService;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductVariantStockResponse;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Las respuestas de producto traen el stock por sucursal, con una sola consulta de stocks. */
@ExtendWith(MockitoExtension.class)
class ProductResponseStockTest {

    private static final Long COMPANY_ID = 1L;
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
    private Category category;
    private Branch centro;
    private Branch norte;

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

        category = Category.builder().name("Ropa").company(company).build();
        category.setId(30L);
        centro = Branch.builder().name("Centro").company(company).build();
        centro.setId(CENTRO_ID);
        norte = Branch.builder().name("Norte").company(company).build();
        norte.setId(NORTE_ID);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listingAttachesEachVariantItsStockWithOneQuery() {
        Product remera = product(20L, "Remera");
        Product buzo = product(21L, "Buzo");
        ProductVariant remeraM = variant(40L, remera, "REM-M");
        ProductVariant buzoL = variant(41L, buzo, "BUZ-L");
        when(productRepository.findByCompanyId(COMPANY_ID)).thenReturn(List.of(remera, buzo));
        when(variantRepository.findByProductIdInWithAttributes(List.of(20L, 21L)))
                .thenReturn(List.of(remeraM, buzoL));
        when(stockRepository.findByProductVariantIdInAndCompanyId(List.of(40L, 41L), COMPANY_ID))
                .thenReturn(List.of(stock(remeraM, centro, 5), stock(remeraM, norte, 0), stock(buzoL, norte, 3)));

        List<ProductResponse> response = productService.findAll(null);

        assertThat(response.get(0).variants().get(0).stock())
                .containsExactly(new ProductVariantStockResponse(CENTRO_ID, 5), new ProductVariantStockResponse(NORTE_ID, 0));
        assertThat(response.get(1).variants().get(0).stock())
                .containsExactly(new ProductVariantStockResponse(NORTE_ID, 3));
        verify(stockRepository, times(1)).findByProductVariantIdInAndCompanyId(any(), any());
    }

    @Test
    void variantWithoutStockRowsComesWithAnEmptyList() {
        Product remera = product(20L, "Remera");
        ProductVariant remeraM = variant(40L, remera, "REM-M");
        when(productRepository.findByIdAndCompanyId(20L, COMPANY_ID)).thenReturn(Optional.of(remera));
        when(variantRepository.findByProductIdInWithAttributes(List.of(20L))).thenReturn(List.of(remeraM));
        when(stockRepository.findByProductVariantIdInAndCompanyId(List.of(40L), COMPANY_ID)).thenReturn(List.of());

        ProductResponse response = productService.findById(20L);

        assertThat(response.variants().get(0).stock()).isEmpty();
    }

    @Test
    void deactivatingKeepsTheStockInTheResponse() {
        Product remera = product(20L, "Remera");
        ProductVariant remeraM = variant(40L, remera, "REM-M");
        when(productRepository.findByIdAndCompanyId(20L, COMPANY_ID)).thenReturn(Optional.of(remera));
        when(variantRepository.findByProductIdInWithAttributes(List.of(20L))).thenReturn(List.of(remeraM));
        when(stockRepository.findByProductVariantIdInAndCompanyId(List.of(40L), COMPANY_ID))
                .thenReturn(List.of(stock(remeraM, centro, 7)));

        ProductResponse response = productService.deactivate(20L);

        assertThat(response.active()).isFalse();
        assertThat(response.variants().get(0).stock()).containsExactly(new ProductVariantStockResponse(CENTRO_ID, 7));
    }

    private Product product(Long id, String name) {
        Product product = Product.builder().name(name).category(category).company(company).build();
        product.setId(id);
        return product;
    }

    private ProductVariant variant(Long id, Product product, String sku) {
        ProductVariant variant = ProductVariant.builder()
                .sku(sku)
                .price(BigDecimal.TEN)
                .product(product)
                .company(company)
                .build();
        variant.setId(id);
        return variant;
    }

    private Stock stock(ProductVariant variant, Branch branch, int quantity) {
        return Stock.builder().productVariant(variant).branch(branch).company(company).quantity(quantity).build();
    }
}
