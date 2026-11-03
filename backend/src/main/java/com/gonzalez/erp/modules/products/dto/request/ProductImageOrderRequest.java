package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Orden nuevo de las fotos del producto o de una variante: todas sus fotos, la primera es la portada. */
public record ProductImageOrderRequest(
        Long variantId,

        @NotNull(message = "Image ids are required")
        List<Long> imageIds
) {}
