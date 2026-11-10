package com.gonzalez.erp.modules.store.dto;

public enum StoreCartLineStatus {
    AVAILABLE,
    // Se sigue vendiendo, pero no alcanza el stock para la cantidad pedida.
    INSUFFICIENT_STOCK,
    // Ya no se puede comprar: despublicado, inactivo, promo vencida o variantes que no la completan.
    UNAVAILABLE
}
