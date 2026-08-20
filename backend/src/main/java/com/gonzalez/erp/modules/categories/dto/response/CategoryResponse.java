package com.gonzalez.erp.modules.categories.dto.response;

import java.time.Instant;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
