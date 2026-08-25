package com.gonzalez.erp.modules.branches.dto.response;

import java.time.Instant;

public record BranchResponse(
        Long id,
        String name,
        String address,
        String phone,
        Long companyId,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
