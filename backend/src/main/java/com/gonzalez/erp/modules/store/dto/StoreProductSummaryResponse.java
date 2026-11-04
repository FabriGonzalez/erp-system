package com.gonzalez.erp.modules.store.dto;

import java.math.BigDecimal;

/** Producto en el listado de la tienda. Precios web; availability es AVAILABLE u OUT_OF_STOCK. */
public record StoreProductSummaryResponse(
        Long id,
        String name,
        Long categoryId,
        String categoryName,
        // Null si no hay foto visible (puede pasar con fotos solo en variantes desactivadas).
        String coverImageUrl,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        StoreAvailability availability
) {}
