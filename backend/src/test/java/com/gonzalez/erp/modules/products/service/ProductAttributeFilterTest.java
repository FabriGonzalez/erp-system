package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.inventory.service.StockMovementRecorder;
import com.gonzalez.erp.modules.inventory.service.StockService;
import com.gonzalez.erp.modules.products.dto.request.ProductSearchCriteria;
import com.gonzalez.erp.modules.products.dto.request.ProductStockFilter;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Filtro de atributos del listado: cuántos atributos abarcan los valores pedidos y de qué empresa son. */
@ExtendWith(MockitoExtension.class)
class ProductAttributeFilterTest {

    private static final Long COMPANY_ID = 1L;

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

    private final Pageable pageable = PageRequest.of(0, 20);

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        User user = User.builder().username("admin").email("admin@acme.com").password("x").company(company).build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));

        ProductAttribute talle = attribute(2L, "Talle", company);
        ProductAttribute color = attribute(3L, "Color", company);
        when(attributeValueRepository.findAllByCompanyIdWithAttribute(COMPANY_ID, null)).thenReturn(List.of(
                value(20L, talle, "M"),
                value(21L, talle, "L"),
                value(30L, color, "Rojo")));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void valuesOfTheSameAttributeCountAsOne() {
        when(productRepository.search(COMPANY_ID, null, null, false, "%", false, false, false, null, true,
                List.of(20L, 21L), 1L, pageable)).thenReturn(Page.empty(pageable));

        productService.findAll(criteria(null, List.of(20L, 21L, 20L)), pageable);

        verify(productRepository).search(COMPANY_ID, null, null, false, "%", false, false, false, null, true,
                List.of(20L, 21L), 1L, pageable);
    }

    @Test
    void valuesOfDifferentAttributesMustAllMatchTheSameVariant() {
        when(productRepository.search(COMPANY_ID, null, null, false, "%", true, false, false, null, true,
                List.of(20L, 21L, 30L), 2L, pageable)).thenReturn(Page.empty(pageable));

        productService.findAll(criteria(ProductStockFilter.IN_STOCK, List.of(20L, 21L, 30L)), pageable);

        verify(productRepository).search(COMPANY_ID, null, null, false, "%", true, false, false, null, true,
                List.of(20L, 21L, 30L), 2L, pageable);
    }

    @Test
    void valueOfAnotherCompanyIsNotFound() {
        assertThatThrownBy(() -> productService.findAll(criteria(null, List.of(20L, 99L)), pageable))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(productRepository, never()).search(any(), any(), any(), anyBoolean(), any(), anyBoolean(),
                anyBoolean(), anyBoolean(), any(), anyBoolean(), any(), anyLong(), any());
    }

    private static ProductSearchCriteria criteria(ProductStockFilter stock, List<Long> attributeValueIds) {
        return new ProductSearchCriteria(null, null, null, stock, null, attributeValueIds);
    }

    private static ProductAttribute attribute(Long id, String name, Company company) {
        ProductAttribute attribute = ProductAttribute.builder().name(name).company(company).build();
        attribute.setId(id);
        return attribute;
    }

    private static ProductAttributeValue value(Long id, ProductAttribute attribute, String name) {
        ProductAttributeValue value = ProductAttributeValue.builder().attribute(attribute).value(name).build();
        value.setId(id);
        return value;
    }
}
