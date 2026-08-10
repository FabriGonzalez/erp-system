package com.gonzalez.erp.modules.products.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        String name,
        String sku,
        String description,
        BigDecimal price,
        Long categoryId,
        String categoryName,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
