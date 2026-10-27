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
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductVariantResponse;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** Una variante sin SKU recibe uno generado, único en la empresa. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductSkuGenerationTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long PRODUCT_ID = 20L;
    private static final Long CATEGORY_ID = 30L;
    private static final Long VARIANT_ID = 40L;
    private static final Long SIZE_M_ID = 50L;
    private static final Long COLOR_BROWN_ID = 51L;
    private static final Long COLOR_MANGO_ID = 52L;

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

    private ProductVariant existingVariant;

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);

        Category category = Category.builder().name("Ropa").company(company).build();
        category.setId(CATEGORY_ID);
        Product product = Product.builder().name("Remera lisa").category(category).company(company).build();
        product.setId(PRODUCT_ID);
        existingVariant = ProductVariant.builder()
                .sku("SKU-RE-M")
                .price(new BigDecimal("1000.00"))
                .product(product)
                .company(company)
                .build();
        existingVariant.setId(VARIANT_ID);

        ProductAttribute size = ProductAttribute.builder().name("Talle").company(company).build();
        size.setId(60L);
        ProductAttribute color = ProductAttribute.builder().name("Color").company(company).build();
        color.setId(61L);
        attributeValue(SIZE_M_ID, size, "M");
        attributeValue(COLOR_BROWN_ID, color, "Marrón");
        attributeValue(COLOR_MANGO_ID, color, "Mango");

        when(productRepository.findByIdAndCompanyId(PRODUCT_ID, COMPANY_ID)).thenReturn(Optional.of(product));
        when(categoryRepository.findByIdAndCompanyId(CATEGORY_ID, COMPANY_ID)).thenReturn(Optional.of(category));
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(variantRepository.findByProductId(PRODUCT_ID)).thenReturn(List.of(existingVariant));
        when(variantRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(productRepository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Role role = Role.builder()
                .name("Rol")
                .code("ROL")
                .company(company)
                .permissions(EnumSet.of(Permission.ADMINISTRAR_PRODUCTOS, Permission.ADMINISTRAR_PRECIOS))
                .build();
        User user = User.builder()
                .username("admin")
                .email("admin@acme.com")
                .password("x")
                .company(company)
                .role(role)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void theBaseTakesTwoLettersOfTheNameAndOfEachValueWithoutAccents() {
        assertThat(Skus.base("Remera estampada", List.of("M", "Rojo"))).isEqualTo("SKU-RE-M-RO");
        assertThat(Skus.base("Ñandú", List.of("Azul"))).isEqualTo("SKU-NA-AZ");
        assertThat(Skus.base("★", List.of())).isEqualTo("SKU");
    }

    @Test
    void aGeneratedSkuSkipsTheOnesAnotherProductAlreadyUses() {
        // "Remera lisa" ya tiene SKU-RE-M y SKU-RE-M-2; "Remera estampada" M arma la misma base.
        when(variantRepository.findSkusWithBase(COMPANY_ID, "SKU-RE-M")).thenReturn(List.of("SKU-RE-M", "SKU-RE-M-2"));

        ProductResponse response = productService.create(new ProductRequest("Remera estampada", null, CATEGORY_ID,
                List.of(new ProductVariantRequest("  ", new BigDecimal("1500"), null, List.of(SIZE_M_ID), List.of()))));

        assertThat(skus(response)).containsExactly("SKU-RE-M-3");
    }

    @Test
    void twoVariantsOfTheSameProductWithTheSameBaseGetDifferentSkus() {
        // Marrón y Mango empiezan igual; el SKU-BU-MA-2 lo pidió otra variante del mismo alta.
        ProductResponse response = productService.create(new ProductRequest("Buzo", null, CATEGORY_ID, List.of(
                new ProductVariantRequest(null, new BigDecimal("2000"), null, List.of(COLOR_BROWN_ID), List.of()),
                new ProductVariantRequest("SKU-BU-MA-2", new BigDecimal("2000"), null, List.of(COLOR_MANGO_ID), List.of()),
                new ProductVariantRequest("", new BigDecimal("2000"), null, List.of(SIZE_M_ID, COLOR_MANGO_ID), List.of()))));

        assertThat(skus(response)).containsExactly("SKU-BU-MA", "SKU-BU-MA-2", "SKU-BU-M-MA");
    }

    @Test
    void editingKeepsTheExistingVariantAndGeneratesTheNewOne() {
        when(variantRepository.findSkusWithBase(COMPANY_ID, "SKU-RE-MA")).thenReturn(List.of());

        ProductResponse response = productService.update(PRODUCT_ID, new ProductUpdateRequest("Remera lisa", null, CATEGORY_ID, List.of(
                new ProductVariantUpdateRequest("SKU-RE-M", new BigDecimal("1000.00"), null, List.of(SIZE_M_ID), List.of()),
                new ProductVariantUpdateRequest("", new BigDecimal("1000.00"), null, List.of(COLOR_BROWN_ID), List.of()))));

        assertThat(skus(response)).containsExactly("SKU-RE-M", "SKU-RE-MA");
        assertThat(existingVariant.isActive()).isTrue();
    }

    private void attributeValue(Long id, ProductAttribute attribute, String value) {
        ProductAttributeValue attributeValue = ProductAttributeValue.builder().attribute(attribute).value(value).build();
        attributeValue.setId(id);
        when(attributeValueRepository.findById(id)).thenReturn(Optional.of(attributeValue));
        when(attributeValueRepository.getReferenceById(id)).thenReturn(attributeValue);
    }

    private static List<String> skus(ProductResponse response) {
        return response.variants().stream().map(ProductVariantResponse::sku).toList();
    }
}
