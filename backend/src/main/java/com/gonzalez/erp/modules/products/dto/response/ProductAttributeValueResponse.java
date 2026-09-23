package com.gonzalez.erp.modules.products.dto.response;

import java.time.Instant;

public record ProductAttributeValueResponse(
        Long id,
        Long attributeId,
        String attributeName,
        String value,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
