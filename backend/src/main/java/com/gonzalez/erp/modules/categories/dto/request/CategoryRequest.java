package com.gonzalez.erp.modules.categories.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CategoryRequest(
        @NotBlank(message = "Category name is required")
        @Size(max = 100, message = "Category name must not exceed 100 characters")
        String name,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        // Sin enviar no cambia los atributos de la categoría (una vacía los quita todos).
        List<Long> attributeIds
) {}
