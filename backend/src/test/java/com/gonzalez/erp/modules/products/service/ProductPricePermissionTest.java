package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.inventory.service.StockService;
import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantUpdateRequest;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import com.gonzalez.erp.modules.products.exception.PricePermissionRequiredException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Fijar o cambiar el precio de una variante exige ADMINISTRAR_PRECIOS. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductPricePermissionTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long PRODUCT_ID = 20L;
    private static final Long CATEGORY_ID = 30L;
    private static final Long VARIANT_ID = 40L;

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

        Category category = Category.builder().name("Ropa").company(company).build();
        category.setId(CATEGORY_ID);
        product = Product.builder().name("Remera").category(category).company(company).build();
        product.setId(PRODUCT_ID);
        variant = ProductVariant.builder()
                .sku("REM-M")
                .price(new BigDecimal("1000.00"))
                .product(product)
                .company(company)
                .build();
        variant.setId(VARIANT_ID);

        when(productRepository.findByIdAndCompanyId(PRODUCT_ID, COMPANY_ID)).thenReturn(Optional.of(product));
        when(categoryRepository.findByIdAndCompanyId(CATEGORY_ID, COMPANY_ID)).thenReturn(Optional.of(category));
        when(variantRepository.findByProductId(PRODUCT_ID)).thenReturn(List.of(variant));
        when(variantRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void creatingWithoutThePricePermissionIsForbidden() {
        loginWith(Permission.ADMINISTRAR_PRODUCTOS);

        assertThatThrownBy(() -> productService.create(new ProductRequest("Buzo", null, CATEGORY_ID,
                List.of(new ProductVariantRequest("BUZ-M", new BigDecimal("2000"), null, List.of(), List.of())))))
                .isInstanceOf(PricePermissionRequiredException.class);
        verify(productRepository, never()).saveAndFlush(any());
    }

    @Test
    void creatingWithThePricePermissionWorks() {
        loginWith(Permission.ADMINISTRAR_PRODUCTOS, Permission.ADMINISTRAR_PRECIOS);

        productService.create(new ProductRequest("Buzo", null, CATEGORY_ID,
                List.of(new ProductVariantRequest("BUZ-M", new BigDecimal("2000"), null, List.of(), List.of()))));

        verify(productRepository).saveAndFlush(any());
    }

    @Test
    void editingWithTheSamePriceDoesNotNeedThePermission() {
        loginWith(Permission.ADMINISTRAR_PRODUCTOS);

        // Otra escala, mismo valor: no es un cambio de precio.
        productService.update(PRODUCT_ID, update("Remera lisa", variantRequest("REM-M", "1000")));

        assertThat(product.getName()).isEqualTo("Remera lisa");
        assertThat(variant.getPrice()).isEqualByComparingTo("1000");
    }

    @Test
    void changingThePriceWithoutThePermissionIsForbidden() {
        loginWith(Permission.ADMINISTRAR_PRODUCTOS);

        assertThatThrownBy(() -> productService.update(PRODUCT_ID,
                update("Remera", variantRequest("REM-M", "1200"))))
                .isInstanceOf(PricePermissionRequiredException.class);
        assertThat(variant.getPrice()).isEqualByComparingTo("1000");
    }

    @Test
    void addingAVariantWithoutThePermissionIsForbidden() {
        loginWith(Permission.ADMINISTRAR_PRODUCTOS);

        // Mismo precio que la que reemplaza, pero es una variante nueva: fija su precio.
        assertThatThrownBy(() -> productService.update(PRODUCT_ID,
                update("Remera", variantRequest("REM-UNICO", "1000"))))
                .isInstanceOf(PricePermissionRequiredException.class);
    }

    @Test
    void changingThePriceWithThePermissionWorks() {
        loginWith(Permission.ADMINISTRAR_PRODUCTOS, Permission.ADMINISTRAR_PRECIOS);

        productService.update(PRODUCT_ID, update("Remera", variantRequest("REM-M", "1200")));

        assertThat(variant.getPrice()).isEqualByComparingTo("1200");
    }

    private void loginWith(Permission first, Permission... rest) {
        Role role = Role.builder()
                .name("Rol")
                .code("ROL")
                .company(company)
                .permissions(EnumSet.of(first, rest))
                .build();
        User user = User.builder()
                .username("vendedor")
                .email("vendedor@acme.com")
                .password("x")
                .company(company)
                .role(role)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    private static ProductVariantUpdateRequest variantRequest(String sku, String price) {
        return new ProductVariantUpdateRequest(sku, new BigDecimal(price), null, List.of(), List.of());
    }

    private static ProductUpdateRequest update(String name, ProductVariantUpdateRequest... variants) {
        return new ProductUpdateRequest(name, null, CATEGORY_ID, List.of(variants));
    }
}
