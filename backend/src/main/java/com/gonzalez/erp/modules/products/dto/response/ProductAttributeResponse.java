package com.gonzalez.erp.modules.products.dto.response;

import java.time.Instant;

public record ProductAttributeResponse(
        Long id,
        String name,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}