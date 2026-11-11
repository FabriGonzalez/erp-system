package com.gonzalez.erp.modules.mercadopago.client;

import java.math.BigDecimal;
import java.time.Instant;

/** Endpoint de preferencias de Mercado Pago: el cobro armado de su lado, con la URL de pago. */
public interface MercadoPagoPreferenceClient {

    /**
     * Crea la preferencia con el token de la cuenta que cobra (la de la empresa). Falla con
     * {@code MercadoPagoException} si Mercado Pago la rechaza o no responde.
     */
    Preference create(String accessToken, PreferenceRequest request);

    /**
     * @param externalReference vuelve en cada pago: así el webhook encuentra el pedido.
     * @param backUrl           adonde vuelve el comprador al terminar, pague o no.
     * @param expiresAt         después de esto el link deja de servir.
     */
    record PreferenceRequest(
            String externalReference,
            String title,
            BigDecimal amount,
            String payerEmail,
            String backUrl,
            Instant expiresAt
    ) {}

    /** initPoint para cuentas reales; sandboxInitPoint para las de prueba. */
    record Preference(String id, String initPoint, String sandboxInitPoint) {}
}
