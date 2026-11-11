package com.gonzalez.erp.modules.mercadopago.entity;

public enum MercadoPagoConnectionStatus {
    CONNECTED,
    /** Mercado Pago rechazó la renovación o el token venció: hay que volver a conectar la cuenta. */
    RECONNECT_REQUIRED
}
