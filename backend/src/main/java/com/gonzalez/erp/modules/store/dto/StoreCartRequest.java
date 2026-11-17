package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** El carrito que guarda el sitio. Los topes están porque el endpoint es público. */
public record StoreCartRequest(
        @Size(max = 50, message = "A cart can have at most 50 items")
        List<@Valid @NotNull(message = "items cannot contain nulls") Item> items,

        @Size(max = 50, message = "A cart can have at most 50 promos")
        List<@Valid @NotNull(message = "promos cannot contain nulls") Promo> promos
) {
    public record Item(
            @NotNull(message = "productVariantId is required")
            Long productVariantId,

            @NotNull(message = "quantity is required")
            @Min(value = 1, message = "Quantity must be at least 1")
            @Max(value = 999, message = "Quantity must be at most 999")
            Integer quantity
    ) {}

    /** variants: las unidades de cada variante por cada promo de la línea. */
    public record Promo(
            @NotNull(message = "promotionId is required")
            Long promotionId,

            @NotNull(message = "quantity is required")
            @Min(value = 1, message = "Quantity must be at least 1")
            @Max(value = 999, message = "Quantity must be at most 999")
            Integer quantity,

            @NotEmpty(message = "variants is required")
            @Size(max = 50, message = "A promo can have at most 50 variants")
            List<@Valid @NotNull(message = "variants cannot contain nulls") Item> variants
    ) {}
}
