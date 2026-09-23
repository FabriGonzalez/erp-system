package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductAttributeValueRequest(
        @NotBlank(message = "Value is required")
        @Size(max = 100, message = "Value must not exceed 100 characters")
        String value
) {}
