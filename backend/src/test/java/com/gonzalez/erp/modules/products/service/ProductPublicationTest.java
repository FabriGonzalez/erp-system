package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
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
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.exception.ProductImageRequiredException;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
import com.gonzalez.erp.modules.products.repository.ProductImageRepository;
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

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Publicar en la tienda exige al menos una foto visible (propia o de una variante activa);
 * despublicar siempre se puede. Qué foto es visible lo prueba StoreCatalogTests contra Postgres.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductPublicationTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long PRODUCT_ID = 20L;

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
    @Mock private ProductImageRepository imageRepository;

    @InjectMocks private ProductServiceImpl productService;

    private Company company;
    private Product product;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        Category category = Category.builder().name("Ropa").company(company).build();
        product = Product.builder().name("Remera").category(category).company(company).build();
        product.setId(PRODUCT_ID);
        login();

        when(productRepository.findByIdAndCompanyId(PRODUCT_ID, COMPANY_ID)).thenReturn(Optional.of(product));
        when(variantRepository.findByProductIdInWithAttributes(List.of(PRODUCT_ID))).thenReturn(List.of());
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void publishingWithoutVisibleImagesIsRejected() {
        when(imageRepository.existsVisibleOfProduct(PRODUCT_ID)).thenReturn(false);

        assertThatThrownBy(() -> productService.updatePublication(PRODUCT_ID, true))
                .isInstanceOf(ProductImageRequiredException.class);
        assertThat(product.isPublishedOnline()).isFalse();
    }

    @Test
    void publishingWithAVisibleImageWorks() {
        when(imageRepository.existsVisibleOfProduct(PRODUCT_ID)).thenReturn(true);

        ProductResponse response = productService.updatePublication(PRODUCT_ID, true);

        assertThat(response.publishedOnline()).isTrue();
        assertThat(product.isPublishedOnline()).isTrue();
    }

    @Test
    void anInactiveProductCanBePublished() {
        product.deactivate();
        when(imageRepository.existsVisibleOfProduct(PRODUCT_ID)).thenReturn(true);

        assertThat(productService.updatePublication(PRODUCT_ID, true).publishedOnline()).isTrue();
    }

    @Test
    void unpublishingDoesNotNeedImages() {
        product.publish();
        when(imageRepository.existsVisibleOfProduct(PRODUCT_ID)).thenReturn(false);

        ProductResponse response = productService.updatePublication(PRODUCT_ID, false);

        assertThat(response.publishedOnline()).isFalse();
        assertThat(product.isPublishedOnline()).isFalse();
    }

    @Test
    void aProductOfAnotherCompanyIsNotFound() {
        when(productRepository.findByIdAndCompanyId(99L, COMPANY_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> productService.updatePublication(99L, true))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private void login() {
        Role role = Role.builder()
                .name("Rol").code("ROL").company(company)
                .permissions(EnumSet.of(Permission.ADMINISTRAR_TIENDA))
                .build();
        User user = User.builder()
                .username("tienda").email("tienda@acme.com").password("x")
                .company(company).role(role)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
