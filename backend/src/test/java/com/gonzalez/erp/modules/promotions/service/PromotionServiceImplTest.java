package com.gonzalez.erp.modules.promotions.service;

import com.gonzalez.erp.common.util.BusinessDate;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.promotions.dto.request.PromotionItemRequest;
import com.gonzalez.erp.modules.promotions.dto.request.PromotionRequest;
import com.gonzalez.erp.modules.promotions.dto.response.PromotionResponse;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionStatus;
import com.gonzalez.erp.modules.promotions.exception.InvalidPromotionException;
import com.gonzalez.erp.modules.promotions.repository.PromotionItemRepository;
import com.gonzalez.erp.modules.promotions.repository.PromotionRepository;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PromotionServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long BUZO_ID = 40L;
    private static final Long PANTALON_ID = 41L;

    @Mock private PromotionRepository promotionRepository;
    @Mock private PromotionItemRepository promotionItemRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private CompanyRepository companyRepository;

    @InjectMocks private PromotionServiceImpl promotionService;

    private Company company;
    private Product buzo;
    private Product pantalon;
    private Promotion saved;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        buzo = product(BUZO_ID, "Buzo");
        pantalon = product(PANTALON_ID, "Pantalón");

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

        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(productRepository.findByIdAndCompanyId(BUZO_ID, COMPANY_ID)).thenReturn(Optional.of(buzo));
        when(productRepository.findByIdAndCompanyId(PANTALON_ID, COMPANY_ID)).thenReturn(Optional.of(pantalon));
        // El buzo sale $30.000 o $35.000 según la variante; el pantalón, $25.000.
        when(productVariantRepository.findByProductIdInAndActiveTrue(anyCollection())).thenReturn(List.of(
                variant(1L, buzo, "30000"), variant(2L, buzo, "35000"), variant(3L, pantalon, "25000")));
        when(promotionRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            saved = invocation.getArgument(0);
            saved.setId(70L);
            return saved;
        });
        // La respuesta lee los productos recién guardados.
        when(promotionItemRepository.findByPromotionIdInWithProduct(anyCollection()))
                .thenAnswer(invocation -> saved.getItems());
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createsAPromoByProductsWithTheRangeOfRegularPrices() {
        LocalDate today = BusinessDate.today();

        PromotionResponse response = promotionService.create(request(today, today.plusDays(7),
                new PromotionItemRequest(BUZO_ID, 1), new PromotionItemRequest(PANTALON_ID, 1)));

        assertThat(response.status()).isEqualTo(PromotionStatus.ACTIVE);
        assertThat(response.items()).hasSize(2);
        assertThat(response.items().get(0).minPrice()).isEqualByComparingTo("30000");
        assertThat(response.items().get(0).maxPrice()).isEqualByComparingTo("35000");
        assertThat(response.regularPriceMin()).isEqualByComparingTo("55000");
        assertThat(response.regularPriceMax()).isEqualByComparingTo("60000");
    }

    @Test
    void endDateBeforeStartDateIsRejected() {
        LocalDate today = BusinessDate.today();

        assertThatThrownBy(() -> promotionService.create(request(today, today.minusDays(1),
                new PromotionItemRequest(BUZO_ID, 1))))
                .isInstanceOf(InvalidPromotionException.class);
        verify(promotionRepository, never()).saveAndFlush(any());
    }

    @Test
    void aProductCannotRepeat() {
        LocalDate today = BusinessDate.today();

        assertThatThrownBy(() -> promotionService.create(request(today, today,
                new PromotionItemRequest(BUZO_ID, 1), new PromotionItemRequest(BUZO_ID, 2))))
                .isInstanceOf(InvalidPromotionException.class);
    }

    @Test
    void inactiveProductsAreRejected() {
        LocalDate today = BusinessDate.today();
        pantalon.deactivate();

        assertThatThrownBy(() -> promotionService.create(request(today, today, new PromotionItemRequest(PANTALON_ID, 1))))
                .isInstanceOf(InvalidPromotionException.class);
    }

    @Test
    void aProductOfAnotherCompanyIsNotFound() {
        LocalDate today = BusinessDate.today();

        assertThatThrownBy(() -> promotionService.create(request(today, today, new PromotionItemRequest(99L, 1))))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private static PromotionRequest request(LocalDate from, LocalDate to, PromotionItemRequest... items) {
        return new PromotionRequest("Buzo + pantalón", null, new BigDecimal("50000"), from, to, List.of(items));
    }

    private Product product(Long id, String name) {
        Product product = Product.builder().name(name).company(company).build();
        product.setId(id);
        return product;
    }

    private ProductVariant variant(Long id, Product product, String price) {
        ProductVariant variant = ProductVariant.builder()
                .product(product)
                .sku("SKU-" + id)
                .price(new BigDecimal(price))
                .company(company)
                .build();
        variant.setId(id);
        return variant;
    }
}
