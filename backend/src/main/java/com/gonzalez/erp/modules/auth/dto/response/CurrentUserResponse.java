package com.gonzalez.erp.modules.auth.dto.response;

import com.gonzalez.erp.modules.roles.entity.Permission;

import java.util.Set;

/** Los datos de sesión de LoginResponse sin el token: el cliente ya lo tiene. */
public record CurrentUserResponse(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String roleName,
        Set<Permission> permissions,
        boolean platformAdmin,
        Long companyId,
        String companyName,
        /** False en las cuentas cuya contraseña administra la empresa. */
        boolean canChangePassword
) {}
