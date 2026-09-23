package com.gonzalez.erp.modules.products.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ProductVariantResponse(
        Long id,
        String sku,
        BigDecimal price,
        boolean active,
        List<ProductAttributeValueResponse> attributes,
        Instant createdAt,
        Instant updatedAt
) {}
