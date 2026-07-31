package com.gonzalez.erp.modules.categories.dto.response;

import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
