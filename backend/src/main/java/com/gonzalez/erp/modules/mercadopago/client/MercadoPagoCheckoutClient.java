package com.gonzalez.erp.modules.mercadopago.client;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

/**
 * Los cobros de la tienda en Mercado Pago: la preferencia (el cobro armado de su lado, con la URL
 * de pago) y los pagos que entran por ella. Todo con el token de la cuenta que cobra, la de la
 * empresa. Cualquier método falla con {@code MercadoPagoException}: {@code rejected} si Mercado
 * Pago dijo que no (reintentar no sirve) y {@code unavailable} si no respondió.
 */
public interface MercadoPagoCheckoutClient {

    Preference createPreference(String accessToken, PreferenceRequest request);

    /** Vence la preferencia ya: el link deja de aceptar pagos. */
    void expirePreference(String accessToken, String preferenceId);

    /** El pago tal como lo ve Mercado Pago. Vacío si esa cuenta no tiene un pago con ese id. */
    Optional<Payment> findPayment(String accessToken, String paymentId);

    /** Devuelve el pago completo al comprador. Repetirla con el mismo id no devuelve dos veces. */
    void refundPayment(String accessToken, String paymentId);

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

    /**
     * @param status            approved, rejected, refunded, etc.
     * @param externalReference la de la preferencia, tal como se mandó.
     */
    record Payment(
            String id,
            String status,
            String externalReference,
            BigDecimal amount,
            String currency
    ) {
        public boolean isApproved() {
            return "approved".equals(status);
        }
    }
}
