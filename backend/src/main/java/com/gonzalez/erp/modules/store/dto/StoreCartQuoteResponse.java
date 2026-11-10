package com.gonzalez.erp.modules.store.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Precios web actuales del carrito. total suma solo las líneas AVAILABLE. El sitio compara cada
 * precio con el que tenía guardado para avisar los cambios.
 */
public record StoreCartQuoteResponse(
        List<Item> items,
        List<Promo> promos,
        BigDecimal total,
        StoreFulfillment fulfillment,
        List<PickupBranch> pickupBranches
) {
    /** productName y los precios van en null si la línea está UNAVAILABLE. */
    public record Item(
            Long productVariantId,
            String productName,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            StoreCartLineStatus status
    ) {}

    /** name y los precios van en null si la línea está UNAVAILABLE. */
    public record Promo(
            Long promotionId,
            String name,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            StoreCartLineStatus status
    ) {}

    /** Una sucursal que puede armar el pedido completo. */
    public record PickupBranch(Long id, String name, String address) {}
}
