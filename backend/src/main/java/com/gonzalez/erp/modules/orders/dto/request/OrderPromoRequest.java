package com.gonzalez.erp.modules.orders.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * Una línea de promo: una combinación de variantes elegidas, vendida quantity veces. La misma
 * promo puede ir en varias líneas con variantes distintas.
 *
 * Línea nueva: promotionId y variants (por cada producto de la promo, variantes suyas cuyas
 * cantidades suman lo que la promo lleva de él). Al editar, una línea que el pedido ya tenía
 * va con su id y solo cambia quantity: conserva lo vendido aunque la promo haya cambiado.
 */
public record OrderPromoRequest(
        // Solo al editar: la línea existente del pedido.
        Long id,

        Long promotionId,

        @Min(value = 1, message = "Quantity must be at least 1")
        @NotNull(message = "quantity is required")
        Integer quantity,

        List<@Valid @NotNull PromoVariantRequest> variants
) {
    /** Unidades de una variante por cada promo de la línea. */
    public record PromoVariantRequest(
            @NotNull(message = "productVariantId is required")
            Long productVariantId,

            @NotNull(message = "quantity is required")
            @Min(value = 1, message = "Quantity must be at least 1")
            Integer quantity
    ) {}
}
