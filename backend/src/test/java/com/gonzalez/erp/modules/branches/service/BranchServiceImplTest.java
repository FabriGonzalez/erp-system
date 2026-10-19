package com.gonzalez.erp.modules.branches.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.dto.request.BranchRequest;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.entity.UserBranch;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Al crear una sucursal quedan asignados el creador y los usuarios con ACCEDER_TODAS_SUCURSALES. */
@ExtendWith(MockitoExtension.class)
class BranchServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long CREATOR_ID = 7L;
    private static final Long OTHER_ADMIN_ID = 8L;
    private static final Long BRANCH_ID = 50L;

    @Mock private BranchRepository branchRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserBranchRepository userBranchRepository;

    @InjectMocks private BranchServiceImpl branchService;

    private Company company;
    private User creator;
    private User otherAdmin;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        creator = user(CREATOR_ID, "admin");
        otherAdmin = user(OTHER_ADMIN_ID, "admin2");

        CustomUserDetails details = new CustomUserDetails(creator);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));

        when(branchRepository.existsByNameAndCompanyId("Norte", COMPANY_ID)).thenReturn(false);
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(branchRepository.save(any(Branch.class))).thenAnswer(invocation -> {
            Branch branch = invocation.getArgument(0);
            branch.setId(BRANCH_ID);
            return branch;
        });
        when(userRepository.getReferenceById(anyLong())).thenAnswer(invocation ->
                invocation.getArgument(0).equals(CREATOR_ID) ? creator : otherAdmin);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void creatorWithThePermissionIsAssignedOnlyOnce() {
        when(userRepository.findByCompanyIdAndRolePermission(COMPANY_ID, Permission.ACCEDER_TODAS_SUCURSALES))
                .thenReturn(List.of(otherAdmin, creator));

        branchService.create(new BranchRequest("Norte", null, null));

        assertThat(savedAssignments())
                .extracting(assignment -> assignment.getUser().getId())
                .containsExactly(CREATOR_ID, OTHER_ADMIN_ID);
        assertThat(savedAssignments())
                .allSatisfy(assignment -> assertThat(assignment.getBranch().getId()).isEqualTo(BRANCH_ID));
    }

    @Test
    void creatorWithoutThePermissionIsAssignedAnyway() {
        when(userRepository.findByCompanyIdAndRolePermission(COMPANY_ID, Permission.ACCEDER_TODAS_SUCURSALES))
                .thenReturn(List.of(otherAdmin));

        branchService.create(new BranchRequest("Norte", null, null));

        assertThat(savedAssignments())
                .extracting(assignment -> assignment.getUser().getId())
                .containsExactly(CREATOR_ID, OTHER_ADMIN_ID);
    }

    @Test
    void withoutOtherUsersOnlyTheCreatorIsAssigned() {
        when(userRepository.findByCompanyIdAndRolePermission(COMPANY_ID, Permission.ACCEDER_TODAS_SUCURSALES))
                .thenReturn(List.of());

        branchService.create(new BranchRequest("Norte", null, null));

        assertThat(savedAssignments())
                .extracting(assignment -> assignment.getUser().getId())
                .containsExactly(CREATOR_ID);
    }

    @SuppressWarnings("unchecked")
    private List<UserBranch> savedAssignments() {
        ArgumentCaptor<List<UserBranch>> captor = ArgumentCaptor.forClass(List.class);
        verify(userBranchRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    private User user(Long id, String username) {
        User user = User.builder()
                .username(username)
                .email(username + "@acme.com")
                .password("x")
                .company(company)
                .build();
        user.setId(id);
        return user;
    }
}
