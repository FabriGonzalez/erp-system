package com.gonzalez.erp.config.security;

import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.EnumSet;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class CustomUserDetailsTest {

    private final Company company = Company.builder().name("Acme").build();

    @Test
    void tenantRoleWithPlatformAdminCodeDoesNotGrantPlatformAccess() {
        Role role = Role.builder()
                .company(company)
                .name("Falso admin")
                .code("PLATFORM_ADMIN")
                .permissions(EnumSet.of(Permission.VER_PEDIDOS))
                .build();

        CustomUserDetails details = new CustomUserDetails(tenantUser(role));

        assertThat(authorities(details))
                .containsExactly("VER_PEDIDOS")
                .doesNotContain("ROLE_PLATFORM_ADMIN");
        assertThat(details.isPlatformAdmin()).isFalse();
    }

    @Test
    void platformAdminGetsOnlyPlatformRole() {
        User user = User.builder()
                .username("platform_admin")
                .email("platform@erp.local")
                .password("x")
                .firstName("Platform")
                .lastName("Admin")
                .platformAdmin(true)
                .build();

        CustomUserDetails details = new CustomUserDetails(user);

        assertThat(authorities(details)).containsExactly("ROLE_PLATFORM_ADMIN");
        assertThat(details.getCompanyId()).isNull();
        assertThat(details.getPermissions()).isEmpty();
    }

    @Test
    void inactiveRoleGrantsNoPermissions() {
        Role role = Role.builder()
                .company(company)
                .name("Vendedor")
                .code("VENDEDOR")
                .permissions(EnumSet.of(Permission.CREAR_PEDIDOS))
                .active(false)
                .build();

        CustomUserDetails details = new CustomUserDetails(tenantUser(role));

        assertThat(authorities(details)).isEmpty();
        assertThat(details.getPermissions()).isEmpty();
    }

    private User tenantUser(Role role) {
        return User.builder()
                .username("vendedor")
                .email("vendedor@acme.com")
                .password("x")
                .firstName("Ven")
                .lastName("Dedor")
                .role(role)
                .company(company)
                .build();
    }

    private Set<String> authorities(CustomUserDetails details) {
        return details.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
    }
}
