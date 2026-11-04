package com.gonzalez.erp.modules.store.dto;

import java.math.BigDecimal;
import java.util.List;

/** Detalle de un producto en la tienda. Sin SKU, costos ni datos de sucursales. */
public record StoreProductResponse(
        Long id,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        List<String> images,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        List<Variant> variants
) {
    public record Variant(
            Long id,
            List<Attribute> attributes,
            BigDecimal price,
            // Las de la variante o, si no tiene, las del producto.
            List<String> images,
            StoreAvailability availability
    ) {}

    public record Attribute(
            String name,
            String value
    ) {}
}
