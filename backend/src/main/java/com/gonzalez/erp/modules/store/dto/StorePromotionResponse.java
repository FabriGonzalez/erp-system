package com.gonzalez.erp.modules.store.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Promo vigente en la tienda, con precios web. La variante de cada unidad la elige el comprador
 * (en 22C, al armar el carrito).
 */
public record StorePromotionResponse(
        Long id,
        String name,
        String description,
        BigDecimal webPrice,
        // Comprando por separado la variante más barata de cada producto: el ahorro es el mínimo
        // real. Los dos en null si la promo no es más barata que comprar por separado.
        BigDecimal regularWebPrice,
        BigDecimal savings,
        // AVAILABLE u OUT_OF_STOCK: si alcanza el stock para una promo, sin decir cuánto hay.
        StoreAvailability availability,
        LocalDate endDate,
        List<Item> items
) {

    public record Item(
            Long productId,
            String productName,
            int quantity,
            // Null si no hay foto visible.
            String coverImageUrl
    ) {}
}
