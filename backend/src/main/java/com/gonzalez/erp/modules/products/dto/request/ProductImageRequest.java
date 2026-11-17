package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.NotBlank;

/** Confirma una foto ya subida con la URL firmada. */
public record ProductImageRequest(
        @NotBlank(message = "Storage key is required")
        String storageKey,

        Long variantId
) {}
