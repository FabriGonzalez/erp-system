package com.gonzalez.erp.modules.branches.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.dto.request.BranchStorePriorityRequest;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchInactiveException;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BranchStorePriorityTest {

    private static final Long COMPANY_ID = 1L;

    @Mock private BranchRepository branchRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserBranchRepository userBranchRepository;

    @InjectMocks private BranchServiceImpl branchService;

    private Company company;
    private Branch centro;
    private Branch norte;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        User user = User.builder().username("admin").email("admin@acme.com").password("x")
                .firstName("Ad").lastName("Min").company(company).build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));

        centro = branch(10L, "Centro", true, 1);
        norte = branch(11L, "Norte", true, null);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void theListIsTheCompleteOrderAndTheOthersStopParticipating() {
        Branch sur = branch(12L, "Sur", true, 2);
        when(branchRepository.findByCompanyId(COMPANY_ID)).thenReturn(List.of(centro, norte, sur));

        branchService.updateStorePriority(new BranchStorePriorityRequest(List.of(11L, 10L)));

        assertThat(norte.getStorePriority()).isEqualTo(1);
        assertThat(centro.getStorePriority()).isEqualTo(2);
        assertThat(sur.getStorePriority()).isNull();
    }

    @Test
    void anEmptyListTakesTheStoreOutOfEveryBranch() {
        when(branchRepository.findByCompanyId(COMPANY_ID)).thenReturn(List.of(centro, norte));

        branchService.updateStorePriority(new BranchStorePriorityRequest(List.of()));

        assertThat(centro.getStorePriority()).isNull();
    }

    @Test
    void aBranchOfAnotherCompanyIsNotFoundAndNothingChanges() {
        when(branchRepository.findByCompanyId(COMPANY_ID)).thenReturn(List.of(centro, norte));

        assertThatThrownBy(() -> branchService.updateStorePriority(new BranchStorePriorityRequest(List.of(99L))))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(centro.getStorePriority()).isEqualTo(1);
    }

    @Test
    void anInactiveBranchCannotSellOnline() {
        Branch closed = branch(12L, "Cerrada", false, null);
        when(branchRepository.findByCompanyId(COMPANY_ID)).thenReturn(List.of(centro, closed));

        assertThatThrownBy(() -> branchService.updateStorePriority(new BranchStorePriorityRequest(List.of(12L))))
                .isInstanceOf(BranchInactiveException.class);
    }

    private Branch branch(Long id, String name, boolean active, Integer priority) {
        Branch branch = Branch.builder().name(name).company(company).active(active).storePriority(priority).build();
        branch.setId(id);
        return branch;
    }
}
