package com.gonzalez.erp.modules.inventory.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchAccessDeniedException;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.exception.StockNotFoundException;
import com.gonzalez.erp.modules.inventory.repository.StockMovementRepository;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockMovementServiceImplTest {

    private static final Long COMPANY_ID = 1L;

    @Mock private StockMovementRepository stockMovementRepository;
    @Mock private StockRepository stockRepository;
    @Mock private BranchAccessService branchAccessService;

    @InjectMocks private StockMovementServiceImpl stockMovementService;

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        User user = User.builder()
                .username("deposito")
                .email("deposito@acme.com")
                .password("x")
                .company(company)
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
    void stockOfAnotherCompanyIsNotFound() {
        // findByIdAndCompanyId filtra por la empresa de la sesión: un stock ajeno no aparece.
        when(stockRepository.findByIdAndCompanyId(99L, COMPANY_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stockMovementService.search(99L, null, null, null, PageRequest.of(0, 20)))
                .isInstanceOf(StockNotFoundException.class);
        verify(stockMovementRepository, never()).search(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void stockOfABranchTheUserCannotAccessIsForbidden() {
        Branch branch = Branch.builder().name("Norte").build();
        branch.setId(11L);
        Stock stock = Stock.builder().branch(branch).quantity(3).build();
        when(stockRepository.findByIdAndCompanyId(5L, COMPANY_ID)).thenReturn(Optional.of(stock));
        doThrow(new BranchAccessDeniedException(11L)).when(branchAccessService).requireAccessible(branch);

        assertThatThrownBy(() -> stockMovementService.search(5L, null, null, null, PageRequest.of(0, 20)))
                .isInstanceOf(BranchAccessDeniedException.class);
        verify(stockMovementRepository, never()).search(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void branchFilterTheUserCannotAccessIsForbidden() {
        when(branchAccessService.requireAccessible(11L)).thenThrow(new BranchAccessDeniedException(11L));

        assertThatThrownBy(() -> stockMovementService.search(null, 11L, null, null, PageRequest.of(0, 20)))
                .isInstanceOf(BranchAccessDeniedException.class);
        verify(stockMovementRepository, never()).search(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void withoutAccessibleBranchesTheListIsEmptyWithoutQuerying() {
        when(branchAccessService.accessibleBranchIds()).thenReturn(List.of());

        PageResponse<StockMovementResponse> page =
                stockMovementService.search(null, null, null, null, PageRequest.of(0, 20));

        assertThat(page.content()).isEmpty();
        verify(stockMovementRepository, never()).search(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void theListIsLimitedToTheAccessibleBranches() {
        PageRequest pageable = PageRequest.of(0, 20);
        when(branchAccessService.accessibleBranchIds()).thenReturn(List.of(10L, 12L));
        when(stockMovementRepository.search(COMPANY_ID, List.of(10L, 12L), null, null, null, null, pageable))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        stockMovementService.search(null, null, null, null, pageable);

        verify(stockMovementRepository).search(COMPANY_ID, List.of(10L, 12L), null, null, null, null, pageable);
    }
}
