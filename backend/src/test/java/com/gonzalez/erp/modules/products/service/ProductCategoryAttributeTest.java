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
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.entity.ProductVariantAttribute;
import com.gonzalez.erp.modules.products.exception.AttributeNotInCategoryException;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Las variantes solo usan los atributos de la categoría del producto. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductCategoryAttributeTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long PRODUCT_ID = 20L;
    private static final Long CATEGORY_ID = 30L;
    private static final Long SIZE_M_ID = 51L;
    private static final Long VOLUME_100_ID = 61L;

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
    private ProductAttributeValue sizeM;
    private ProductAttributeValue volume100;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);

        ProductAttribute size = attribute(50L, "Talle");
        ProductAttribute volume = attribute(60L, "Volumen");
        sizeM = value(SIZE_M_ID, size, "M");
        volume100 = value(VOLUME_100_ID, volume, "100 ml");

        category = Category.builder().name("Perfumes").company(company).build();
        category.setId(CATEGORY_ID);
        category.replaceAttributes(List.of(volume));

        when(categoryRepository.findByIdAndCompanyId(CATEGORY_ID, COMPANY_ID)).thenReturn(Optional.of(category));
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
    void aNewProductCannotUseAnAttributeOutsideItsCategory() {
        assertThatThrownBy(() -> productService.create(create(SIZE_M_ID)))
                .isInstanceOf(AttributeNotInCategoryException.class)
                .hasMessageContaining("Talle")
                .hasMessageContaining("Perfumes");
        verify(variantRepository, never()).saveAndFlush(any());
    }

    @Test
    void aNewProductUsesTheAttributesOfItsCategory() {
        productService.create(create(VOLUME_100_ID));

        verify(variantRepository).saveAndFlush(any());
    }

    @Test
    void editingKeepsAnAttributeTheVariantAlreadyHadOutsideTheCategory() {
        ProductVariant variant = existingProductWithVariant("PER-M", sizeM);

        productService.update(PRODUCT_ID, new ProductUpdateRequest("Perfume", null, CATEGORY_ID, List.of(
                new ProductVariantUpdateRequest("PER-M", new BigDecimal("1000"), null, List.of(SIZE_M_ID), List.of()))));

        assertThat(variant.getAttributes())
                .extracting(pva -> pva.getAttributeValue().getId())
                .containsExactly(SIZE_M_ID);
    }

    @Test
    void editingCannotAddAnAttributeOutsideTheCategory() {
        existingProductWithVariant("PER-100", volume100);

        assertThatThrownBy(() -> productService.update(PRODUCT_ID, new ProductUpdateRequest("Perfume", null, CATEGORY_ID,
                List.of(
                        new ProductVariantUpdateRequest("PER-100", new BigDecimal("1000"), null,
                                List.of(VOLUME_100_ID), List.of()),
                        new ProductVariantUpdateRequest("PER-M", new BigDecimal("1000"), null,
                                List.of(SIZE_M_ID), List.of())))))
                .isInstanceOf(AttributeNotInCategoryException.class);
    }

    private ProductVariant existingProductWithVariant(String sku, ProductAttributeValue value) {
        Product product = Product.builder().name("Perfume").category(category).company(company).build();
        product.setId(PRODUCT_ID);
        ProductVariant variant = ProductVariant.builder()
                .sku(sku)
                .price(new BigDecimal("1000.00"))
                .product(product)
                .company(company)
                .build();
        variant.setId(40L);
        variant.getAttributes().add(ProductVariantAttribute.builder().variant(variant).attributeValue(value).build());

        when(productRepository.findByIdAndCompanyId(PRODUCT_ID, COMPANY_ID)).thenReturn(Optional.of(product));
        when(variantRepository.findByProductId(PRODUCT_ID)).thenReturn(List.of(variant));
        return variant;
    }

    private static ProductRequest create(Long valueId) {
        return new ProductRequest("Perfume", null, CATEGORY_ID, List.of(
                new ProductVariantRequest("PER-1", new BigDecimal("1000"), null, List.of(valueId), List.of())));
    }

    private ProductAttribute attribute(Long id, String name) {
        ProductAttribute attribute = ProductAttribute.builder().name(name).company(company).build();
        attribute.setId(id);
        return attribute;
    }

    private ProductAttributeValue value(Long id, ProductAttribute attribute, String name) {
        ProductAttributeValue value = ProductAttributeValue.builder().attribute(attribute).value(name).build();
        value.setId(id);
        when(attributeValueRepository.findById(id)).thenReturn(Optional.of(value));
        when(attributeValueRepository.getReferenceById(id)).thenReturn(value);
        return value;
    }
}
