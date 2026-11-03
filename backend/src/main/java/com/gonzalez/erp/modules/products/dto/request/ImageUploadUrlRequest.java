package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ImageUploadUrlRequest(
        // Sin variante, la foto es del producto.
        Long variantId,

        @NotBlank(message = "Content type is required")
        String contentType,

        @NotNull(message = "Size is required")
        @Positive(message = "Size must be greater than 0")
        Long sizeBytes
) {}
