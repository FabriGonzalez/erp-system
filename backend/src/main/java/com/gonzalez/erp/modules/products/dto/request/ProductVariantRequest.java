package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.Valid;
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
        @DecimalMin(value = "0.0", inclusive = false, message = "Variant price must be greater than 0")
        BigDecimal price,

        // Vacío = producto sin variantes (una sola variante sin atributos).
        List<Long> attributeValueIds,

        List<@Valid InitialStockRequest> initialStock
) {
    public ProductVariantRequest {
        attributeValueIds = attributeValueIds == null ? List.of() : attributeValueIds;
    }
}
