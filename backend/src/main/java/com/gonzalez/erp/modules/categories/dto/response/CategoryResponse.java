package com.gonzalez.erp.modules.categories.dto.response;

import java.time.Instant;
import java.util.List;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        Long companyId,
        boolean active,
        List<Long> attributeIds,
        Instant createdAt,
        Instant updatedAt
) {}
