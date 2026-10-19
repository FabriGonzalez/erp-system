package com.gonzalez.erp.modules.branches.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchAccessDeniedException;
import com.gonzalez.erp.modules.branches.exception.BranchInactiveException;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BranchAccessServiceTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long USER_ID = 7L;
    private static final Long BRANCH_ID = 10L;

    @Mock private BranchRepository branchRepository;
    @Mock private UserBranchRepository userBranchRepository;

    @InjectMocks private BranchAccessService branchAccessService;

    private Branch branch;

    @BeforeEach
    void setUp() {
        Company company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        User user = User.builder()
                .username("vendedor")
                .email("vendedor@acme.com")
                .password("x")
                .company(company)
                .build();
        user.setId(USER_ID);
        branch = Branch.builder().name("Centro").company(company).build();
        branch.setId(BRANCH_ID);

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void accessibleBranchIdsComeFromTheUserAndTheCompanyOfTheSession() {
        when(userBranchRepository.findAccessibleBranchIds(USER_ID, COMPANY_ID)).thenReturn(List.of(BRANCH_ID));

        assertThat(branchAccessService.accessibleBranchIds()).containsExactly(BRANCH_ID);
    }

    @Test
    void anAssignedActiveBranchIsAccessible() {
        when(branchRepository.findByIdAndCompanyId(BRANCH_ID, COMPANY_ID)).thenReturn(Optional.of(branch));
        when(userBranchRepository.existsByUserIdAndBranchId(USER_ID, BRANCH_ID)).thenReturn(true);

        assertThat(branchAccessService.requireAccessible(BRANCH_ID)).isSameAs(branch);
    }

    @Test
    void aBranchThatIsNotAssignedIsForbidden() {
        when(branchRepository.findByIdAndCompanyId(BRANCH_ID, COMPANY_ID)).thenReturn(Optional.of(branch));
        when(userBranchRepository.existsByUserIdAndBranchId(USER_ID, BRANCH_ID)).thenReturn(false);

        assertThatThrownBy(() -> branchAccessService.requireAccessible(BRANCH_ID))
                .isInstanceOf(BranchAccessDeniedException.class);
    }

    @Test
    void anInactiveBranchCountsAsNotAssigned() {
        // Desactivar no borra la asignación: la sucursal sigue en user_branches.
        branch.deactivate();
        when(branchRepository.findByIdAndCompanyId(BRANCH_ID, COMPANY_ID)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> branchAccessService.requireAccessible(BRANCH_ID))
                .isInstanceOf(BranchAccessDeniedException.class);
        assertThat(branchAccessService.isAccessible(branch)).isFalse();
    }

    @Test
    void aBranchOfAnotherCompanyIsNotFound() {
        when(branchRepository.findByIdAndCompanyId(BRANCH_ID, COMPANY_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> branchAccessService.requireAccessible(BRANCH_ID))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> branchAccessService.requireActive(BRANCH_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void requireActiveDoesNotNeedTheAssignment() {
        when(branchRepository.findByIdAndCompanyId(BRANCH_ID, COMPANY_ID)).thenReturn(Optional.of(branch));

        assertThat(branchAccessService.requireActive(BRANCH_ID)).isSameAs(branch);
    }

    @Test
    void requireActiveRejectsAnInactiveBranch() {
        branch.deactivate();
        when(branchRepository.findByIdAndCompanyId(BRANCH_ID, COMPANY_ID)).thenReturn(Optional.of(branch));

        assertThatThrownBy(() -> branchAccessService.requireActive(BRANCH_ID))
                .isInstanceOf(BranchInactiveException.class);
    }
}
