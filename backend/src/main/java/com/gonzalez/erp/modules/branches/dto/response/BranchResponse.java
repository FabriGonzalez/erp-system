package com.gonzalez.erp.modules.branches.dto.response;

import java.time.LocalDateTime;

public record BranchResponse(
        Long id,
        String name,
        String address,
        String phone,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
