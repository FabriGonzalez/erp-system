package com.gonzalez.erp.modules.provisioning.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.provisioning.dto.request.ProvisionCompanyRequest;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.EnumSet;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ProvisioningServiceImplTest {

    @Mock private CompanyRepository companyRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private ProvisioningServiceImpl provisioningService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void tenantAdminWithPlatformAdminRoleCodeCannotProvision() {
        Company company = Company.builder().name("Acme").build();
        company.setId(1L);
        // El peor caso: un admin de empresa con todos los permisos y un rol llamado PLATFORM_ADMIN.
        Role role = Role.builder()
                .company(company)
                .name("Falso admin")
                .code("PLATFORM_ADMIN")
                .permissions(EnumSet.allOf(Permission.class))
                .build();
        User tenantAdmin = User.builder()
                .username("admin")
                .email("admin@acme.com")
                .password("x")
                .firstName("Ad")
                .lastName("Min")
                .role(role)
                .company(company)
                .build();
        authenticate(tenantAdmin);

        ProvisionCompanyRequest request = new ProvisionCompanyRequest(
                "Otra", null, null, "otro_admin", "otro@otra.com", null, null);

        assertThatThrownBy(() -> provisioningService.provisionCompany(request))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(companyRepository, roleRepository, userRepository);
    }

    private void authenticate(User user) {
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
