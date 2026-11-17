package com.gonzalez.erp.modules.store.dto;

public enum StoreFulfillment {
    SINGLE_BRANCH,
    // Hay stock sumando sucursales, pero ninguna lo arma sola: el sitio avisa que puede demorar.
    MULTIPLE_BRANCHES,
    // Alguna línea no se puede comprar, o el carrito está vacío.
    UNAVAILABLE
}
