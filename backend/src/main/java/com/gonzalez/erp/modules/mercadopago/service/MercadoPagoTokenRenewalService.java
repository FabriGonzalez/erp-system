package com.gonzalez.erp.modules.mercadopago.service;

/** Renueva los tokens de Mercado Pago antes de que venzan (duran 180 días). */
public interface MercadoPagoTokenRenewalService {

    /**
     * Renueva las conexiones a las que les quedan menos de 30 días. Si Mercado Pago rechaza la
     * renovación o el token ya venció, la conexión queda para reconectar y se avisa por mail a
     * quien la conectó (una sola vez). Si Mercado Pago no responde, se reintenta en la próxima pasada.
     */
    void renewExpiringTokens();
}
