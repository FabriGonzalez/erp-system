package com.gonzalez.erp.config.security;

import com.gonzalez.erp.modules.companies.entity.CompanyStatus;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.users.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.Set;

@Getter
public class CustomUserDetails implements UserDetails {

    public static final String PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN";

    private final Long userId;
    private final String username;
    private final String password;
    private final String email;
    private final String firstName;
    private final String lastName;
    private final String roleName;
    private final Set<Permission> permissions;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean active;
    private final boolean platformAdmin;
    private final Long companyId;
    private final String companyName;
    /** Null solo para administradores de plataforma, que no pertenecen a una empresa. */
    private final CompanyStatus companyStatus;
    private final Instant passwordChangedAt;

    public CustomUserDetails(User user) {
        this.userId = user.getId();
        this.username = user.getUsername();
        this.password = user.getPassword();
        this.email = user.getEmail();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.platformAdmin = user.isPlatformAdmin();
        this.companyId = user.getCompany() != null ? user.getCompany().getId() : null;
        this.companyName = user.getCompany() != null ? user.getCompany().getName() : null;
        this.companyStatus = user.getCompany() != null ? user.getCompany().getStatus() : null;
        this.passwordChangedAt = user.getPasswordChangedAt();

        Role role = user.getRole();
        this.roleName = role != null ? role.getName() : null;
        // Un rol desactivado deja al usuario sin permisos, pero no le impide loguearse.
        this.permissions = (role != null && role.isActive() && !role.getPermissions().isEmpty())
                ? EnumSet.copyOf(role.getPermissions())
                : EnumSet.noneOf(Permission.class);

        // ROLE_PLATFORM_ADMIN sale solo del flag del usuario, nunca del código de un rol de
        // empresa: así un tenant no puede obtenerlo creando un rol con ese código.
        Set<GrantedAuthority> auths = new HashSet<>();
        if (platformAdmin) {
            auths.add(new SimpleGrantedAuthority("ROLE_" + PLATFORM_ADMIN_ROLE));
        } else {
            this.permissions.forEach(p -> auths.add(new SimpleGrantedAuthority(p.name())));
        }
        this.authorities = auths;

        this.active = user.isActive();
    }

    /**
     * Si la empresa del usuario puede operar. Se evalúa aparte de isEnabled() para que el
     * login y JwtAuthFilter respondan con un motivo explícito en vez de credenciales inválidas.
     */
    public boolean isCompanyActive() {
        return companyStatus == null || companyStatus == CompanyStatus.ACTIVE;
    }

    /**
     * Un token emitido antes del último cambio de contraseña queda revocado. El iat del JWT
     * tiene precisión de segundos, así que se compara contra el cambio truncado a segundos.
     */
    public boolean isTokenIssuedBeforePasswordChange(Instant issuedAt) {
        return passwordChangedAt != null
                && issuedAt != null
                && issuedAt.isBefore(passwordChangedAt.truncatedTo(ChronoUnit.SECONDS));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
