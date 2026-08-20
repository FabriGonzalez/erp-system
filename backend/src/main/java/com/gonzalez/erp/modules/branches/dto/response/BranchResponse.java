package com.gonzalez.erp.modules.branches.dto.response;

import java.time.Instant;

public record BranchResponse(
        Long id,
        String name,
        String address,
        String phone,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
