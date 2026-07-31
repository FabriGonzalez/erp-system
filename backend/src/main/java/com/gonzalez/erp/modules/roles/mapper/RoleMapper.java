package com.gonzalez.erp.modules.roles.mapper;

import com.gonzalez.erp.modules.roles.dto.response.RoleResponse;
import com.gonzalez.erp.modules.roles.entity.Role;

public final class RoleMapper {
    private RoleMapper() {}

    public static RoleResponse toResponse(Role role) {
        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getCode(),
                role.getDescription(),
                role.getPermissions(),
                role.isActive(),
                role.getCreatedAt(),
                role.getUpdatedAt()
        );
    }
}
