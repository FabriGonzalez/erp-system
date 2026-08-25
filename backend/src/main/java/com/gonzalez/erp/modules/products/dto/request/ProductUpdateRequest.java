package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductUpdateRequest(
        @NotBlank(message = "Product name is required")
        @Size(max = 100, message = "Product name must not exceed 100 characters")
        String name,

        @NotBlank(message = "Color is required")
        @Size(max = 50, message = "Color must not exceed 50 characters")
        String color,

        @NotBlank(message = "Talle is required")
        @Size(max = 50, message = "Talle must not exceed 50 characters")
        String talle,

        @Size(max = 500, message = "Description must not exceed 500 characters")
        String description,

        @NotNull(message = "Product price is required")
        @DecimalMin(value = "0.0", message = "Product price cannot be negative")
        BigDecimal price,

        @NotNull(message = "Category is required")
        Long categoryId
) {}
