package com.gonzalez.erp.modules.users.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import com.gonzalez.erp.modules.users.dto.request.UserRequest;
import com.gonzalez.erp.modules.users.entity.User;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.EnumSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long ROLE_ID = 10L;

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private CompanyRepository companyRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private UserServiceImpl userService;

    private Company company;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        adminRole = Role.builder()
                .company(company)
                .name("Administrador")
                .code("ADMIN")
                .permissions(EnumSet.allOf(Permission.class))
                .build();
        adminRole.setId(ROLE_ID);

        User tenantAdmin = User.builder()
                .username("admin")
                .email("admin@acme.com")
                .password("x")
                .firstName("Ad")
                .lastName("Min")
                .role(adminRole)
                .company(company)
                .build();
        CustomUserDetails details = new CustomUserDetails(tenantAdmin);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createdUserIsNeverPlatformAdmin() {
        when(roleRepository.findByIdAndCompanyId(ROLE_ID, COMPANY_ID)).thenReturn(Optional.of(adminRole));
        when(companyRepository.getReferenceById(COMPANY_ID)).thenReturn(company);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.create(request(ROLE_ID));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().isPlatformAdmin()).isFalse();
        assertThat(saved.getValue().getCompany().getId()).isEqualTo(COMPANY_ID);
    }

    @Test
    void cannotAssignRoleFromAnotherCompany() {
        Long foreignRoleId = 99L;
        when(roleRepository.findByIdAndCompanyId(foreignRoleId, COMPANY_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.create(request(foreignRoleId)))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(userRepository, never()).save(any());
    }

    private UserRequest request(Long roleId) {
        return new UserRequest("nuevo", "secreto123", "nuevo@acme.com", "Nu", "Evo", roleId);
    }
}
