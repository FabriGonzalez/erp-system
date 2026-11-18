package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.products.dto.ColorSwatch;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeValueRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.repository.ProductAttributeRepository;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductAttributeServiceImplTest {

    private static final Long COMPANY_ID = 1L;

    @Mock private ProductAttributeRepository attributeRepository;
    @Mock private ProductAttributeValueRepository attributeValueRepository;
    @Mock private CompanyRepository companyRepository;

    @InjectMocks private ProductAttributeServiceImpl attributeService;

    private ProductAttribute color;

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
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

        color = ProductAttribute.builder().name("Color").company(company).build();
        color.setId(3L);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void allValuesComeFromTheCompanyOfTheSessionWithTheirAttribute() {
        when(attributeValueRepository.findAllByCompanyIdWithAttribute(COMPANY_ID, null))
                .thenReturn(List.of(value(8L, "Azul"), value(9L, "Rojo")));

        List<ProductAttributeValueResponse> values = attributeService.findAllValues(null);

        assertThat(values)
                .extracting(ProductAttributeValueResponse::id, ProductAttributeValueResponse::attributeName,
                        ProductAttributeValueResponse::value)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(8L, "Color", "Azul"),
                        org.assertj.core.groups.Tuple.tuple(9L, "Color", "Rojo"));
    }

    @Test
    void activeFilterIsPassedToTheQuery() {
        when(attributeValueRepository.findAllByCompanyIdWithAttribute(COMPANY_ID, true))
                .thenReturn(List.of(value(8L, "Azul")));

        assertThat(attributeService.findAllValues(true)).hasSize(1);
    }

    @Test
    void aNewValueKeepsItsSwatchColorsInOrderAndInUppercase() {
        when(attributeRepository.findByIdAndCompanyId(3L, COMPANY_ID)).thenReturn(Optional.of(color));
        when(attributeValueRepository.saveAndFlush(any(ProductAttributeValue.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ProductAttributeValueResponse created = attributeService.addValue(3L,
                new ProductAttributeValueRequest("Boca", new ColorSwatch(List.of("#003a8c", "#FFD100", "#003a8c"))));

        assertThat(created.swatch().colors()).containsExactly("#003A8C", "#FFD100", "#003A8C");
    }

    @Test
    void aValueWithoutSwatchHasNoSwatch() {
        when(attributeRepository.findByIdAndCompanyId(3L, COMPANY_ID)).thenReturn(Optional.of(color));
        when(attributeValueRepository.saveAndFlush(any(ProductAttributeValue.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(attributeService.addValue(3L, new ProductAttributeValueRequest("Azul")).swatch()).isNull();
    }

    @Test
    void editingAValueReplacesItsSwatch() {
        ProductAttributeValue black = value(8L, "Negro");
        black.update("Negro", List.of("#000000"));
        when(attributeValueRepository.findByIdAndAttributeCompanyId(8L, COMPANY_ID)).thenReturn(Optional.of(black));

        ProductAttributeValueResponse striped = attributeService.updateValue(8L,
                new ProductAttributeValueRequest("Negro", new ColorSwatch(List.of("#000000", "#ffffff"))));
        assertThat(striped.swatch().colors()).containsExactly("#000000", "#FFFFFF");

        assertThat(attributeService.updateValue(8L, new ProductAttributeValueRequest("Negro")).swatch()).isNull();
        assertThat(black.getSwatchColors()).isNull();
    }

    private ProductAttributeValue value(Long id, String name) {
        ProductAttributeValue value = ProductAttributeValue.builder().attribute(color).value(name).build();
        value.setId(id);
        return value;
    }
}
