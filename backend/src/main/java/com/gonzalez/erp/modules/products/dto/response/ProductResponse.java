package com.gonzalez.erp.modules.products.dto.response;

import java.time.Instant;
import java.util.List;

public record ProductResponse(
        Long id,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        boolean active,
        List<ProductVariantResponse> variants,
        Instant createdAt,
        Instant updatedAt
) {}