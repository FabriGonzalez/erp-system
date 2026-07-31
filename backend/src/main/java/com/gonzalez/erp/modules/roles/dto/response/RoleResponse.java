package com.gonzalez.erp.modules.roles.dto.response;

import com.gonzalez.erp.modules.roles.entity.Permission;

import java.time.LocalDateTime;
import java.util.Set;

public record RoleResponse(
        Long id,
        String name,
        String code,
        String description,
        Set<Permission> permissions,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
