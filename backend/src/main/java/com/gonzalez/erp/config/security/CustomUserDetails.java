package com.gonzalez.erp.config.security;

import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.users.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
public class CustomUserDetails implements UserDetails {

    private final Long userId;
    private final String username;
    private final String password;
    private final String roleCode;
    private final String email;
    private final String firstName;
    private final String lastName;
    private final String roleName;
    private final Set<Permission> permissions;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean active;
    private final Long companyId;
    private final String companyName;

    public CustomUserDetails(User user) {
        this.userId = user.getId();
        this.username = user.getUsername();
        this.password = user.getPassword();
        this.roleCode = user.getRole().getCode();
        this.email = user.getEmail();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.roleName = user.getRole().getName();
        this.permissions = user.getRole().getPermissions();
        this.companyId = user.getCompany() != null ? user.getCompany().getId() : null;
        this.companyName = user.getCompany() != null ? user.getCompany().getName() : null;

        Set<GrantedAuthority> auths = user.getRole().getPermissions().stream()
                .map(p -> new SimpleGrantedAuthority(p.name()))
                .collect(Collectors.toSet());
        auths.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().getCode()));
        this.authorities = auths;

        this.active = user.isActive();
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
