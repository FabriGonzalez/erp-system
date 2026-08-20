package com.gonzalez.erp.modules.users.dto.response;

import java.time.Instant;

public record UserResponse(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        Long roleId,
        String roleName,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
