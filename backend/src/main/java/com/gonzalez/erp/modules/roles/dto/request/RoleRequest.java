package com.gonzalez.erp.modules.roles.dto.request;

import com.gonzalez.erp.modules.roles.entity.Permission;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record RoleRequest(
        @NotBlank(message = "Role name is required")
        @Size(max = 50, message = "Role name must not exceed 50 characters")
        String name,

        @NotBlank(message = "Role code is required")
        @Size(max = 20, message = "Role code must not exceed 20 characters")
        String code,

        @Size(max = 200, message = "Description must not exceed 200 characters")
        String description,

        Set<Permission> permissions
) {}
