package com.gonzalez.erp.modules.auth.dto.response;

import com.gonzalez.erp.modules.roles.entity.Permission;

import java.util.Set;

public record LoginResponse(
        String token,
        String type,
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String roleName,
        Set<Permission> permissions
) {}
