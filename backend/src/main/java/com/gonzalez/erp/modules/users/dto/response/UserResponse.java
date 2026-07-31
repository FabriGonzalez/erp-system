package com.gonzalez.erp.modules.users.dto.response;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        Long roleId,
        String roleName,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
