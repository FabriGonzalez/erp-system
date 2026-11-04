package com.gonzalez.erp.modules.store.dto;

/**
 * Disponibilidad sin la cantidad exacta: la tienda no expone el inventario. La cantidad real la
 * valida el checkout.
 */
public enum StoreAvailability {
    AVAILABLE,
    LOW_STOCK,
    OUT_OF_STOCK
}
