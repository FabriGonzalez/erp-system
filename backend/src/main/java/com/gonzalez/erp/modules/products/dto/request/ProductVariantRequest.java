package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record ProductVariantRequest(
        @NotBlank(message = "SKU is required")
        @Size(max = 50, message = "SKU must not exceed 50 characters")
        String sku,

        @NotNull(message = "Variant price is required")
        @DecimalMin(value = "0.0", message = "Variant price cannot be negative")
        BigDecimal price,

        @NotNull(message = "At least one attribute value is required")
        @Size(min = 1, message = "At least one attribute value is required")
        List<Long> attributeValueIds
) {}
