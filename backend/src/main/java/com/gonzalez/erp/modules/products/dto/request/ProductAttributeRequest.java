package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductAttributeRequest(
        @NotBlank(message = "Attribute name is required")
        @Size(max = 100, message = "Attribute name must not exceed 100 characters")
        String name
) {}
