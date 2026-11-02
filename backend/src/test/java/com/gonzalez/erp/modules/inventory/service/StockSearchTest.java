package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Listado paginado de stock: búsqueda, filtro de variantes y sucursal de la empresa. */
@ExtendWith(MockitoExtension.class)
class StockSearchTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long BRANCH_ID = 10L;

    @Mock private StockRepository stockRepository;
    @Mock private StockMovementRecorder stockMovementRecorder;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private BranchAccessService branchAccessService;
    @Mock private ProductAttributeValueRepository attributeValueRepository;

    @InjectMocks private StockServiceImpl stockService;

    private Company company;
    private final Pageable pageable = PageRequest.of(0, 20);

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        User user = User.builder().username("admin").email("admin@acme.com").password("x").company(company).build();
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
    void withoutVariantIdsTheVariantFilterIsOff() {
        when(stockRepository.search(COMPANY_ID, null, false, List.of(-1L), false, "%", false, List.of(-1L), 0L, pageable))
                .thenReturn(Page.empty(pageable));

        stockService.search(null, "  ", List.of(), null, pageable);

        verify(stockRepository).search(COMPANY_ID, null, false, List.of(-1L), false, "%", false, List.of(-1L), 0L, pageable);
    }

    @Test
    void searchAndVariantIdsReachTheQuery() {
        Branch branch = Branch.builder().name("Centro").company(company).build();
        branch.setId(BRANCH_ID);
        when(branchRepository.findById(BRANCH_ID)).thenReturn(Optional.of(branch));
        when(stockRepository.search(COMPANY_ID, BRANCH_ID, true, List.of(40L, 41L), true, "%remera%", false, List.of(-1L), 0L, pageable))
                .thenReturn(Page.empty(pageable));

        stockService.search(BRANCH_ID, "Reméra", List.of(40L, 41L), null, pageable);

        verify(stockRepository).search(COMPANY_ID, BRANCH_ID, true, List.of(40L, 41L), true, "%remera%", false, List.of(-1L), 0L, pageable);
    }

    @Test
    void attributeValuesReachTheQueryWithTheirAttributeCount() {
        ProductAttribute talle = ProductAttribute.builder().name("Talle").company(company).build();
        talle.setId(2L);
        ProductAttribute color = ProductAttribute.builder().name("Color").company(company).build();
        color.setId(3L);
        when(attributeValueRepository.findAllByCompanyIdWithAttribute(COMPANY_ID, null)).thenReturn(List.of(
                attributeValue(20L, talle), attributeValue(21L, talle), attributeValue(30L, color)));
        when(stockRepository.search(COMPANY_ID, null, false, List.of(-1L), false, "%", true, List.of(20L, 21L, 30L),
                2L, pageable)).thenReturn(Page.empty(pageable));

        stockService.search(null, null, null, List.of(20L, 21L, 30L), pageable);

        verify(stockRepository).search(COMPANY_ID, null, false, List.of(-1L), false, "%", true,
                List.of(20L, 21L, 30L), 2L, pageable);
    }

    @Test
    void attributeValueOfAnotherCompanyIsNotFound() {
        when(attributeValueRepository.findAllByCompanyIdWithAttribute(COMPANY_ID, null)).thenReturn(List.of());

        assertThatThrownBy(() -> stockService.search(null, null, null, List.of(99L), pageable))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(stockRepository, never()).search(any(), any(), anyBoolean(), any(), anyBoolean(), anyString(), anyBoolean(), any(), anyLong(), any());
    }

    private static ProductAttributeValue attributeValue(Long id, ProductAttribute attribute) {
        ProductAttributeValue value = ProductAttributeValue.builder().attribute(attribute).value("v" + id).build();
        value.setId(id);
        return value;
    }

    @Test
    void branchOfAnotherCompanyIsNotFound() {
        Company other = Company.builder().name("Otra").build();
        other.setId(2L);
        Branch foreign = Branch.builder().name("Ajena").company(other).build();
        foreign.setId(BRANCH_ID);
        when(branchRepository.findById(BRANCH_ID)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> stockService.search(BRANCH_ID, null, null, null, pageable))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(stockRepository, never()).search(any(), any(), anyBoolean(), any(), anyBoolean(), anyString(), anyBoolean(), any(), anyLong(), any());
    }
}
