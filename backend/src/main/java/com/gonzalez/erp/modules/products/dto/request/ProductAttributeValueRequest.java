package com.gonzalez.erp.modules.products.dto.request;

import com.gonzalez.erp.modules.products.dto.ColorSwatch;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductAttributeValueRequest(
        @NotBlank(message = "Value is required")
        @Size(max = 100, message = "Value must not exceed 100 characters")
        String value,
        // Opcional: null (o ausente) deja el valor sin muestra, también al editar.
        @Valid ColorSwatch swatch
) {
    public ProductAttributeValueRequest(String value) {
        this(value, null);
    }
}
