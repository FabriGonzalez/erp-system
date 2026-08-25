package com.gonzalez.erp.modules.products.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String color,
        String talle,
        String description,
        BigDecimal price,
        Long categoryId,
        String categoryName,
        Long companyId,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
