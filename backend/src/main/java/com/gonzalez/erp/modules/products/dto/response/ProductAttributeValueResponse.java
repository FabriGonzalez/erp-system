package com.gonzalez.erp.modules.products.dto.response;

import com.gonzalez.erp.modules.products.dto.ColorSwatch;

import java.time.Instant;

public record ProductAttributeValueResponse(
        Long id,
        Long attributeId,
        String attributeName,
        String value,
        ColorSwatch swatch,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
