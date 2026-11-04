package com.gonzalez.erp.modules.products.dto.response;

public record ProductImageResponse(
        Long id,
        // Null si la foto es del producto.
        Long variantId,
        String url,
        int sortOrder,
        // False si es de una variante inactiva: el panel avisa que la tienda no la muestra.
        boolean visibleInStore
) {}
