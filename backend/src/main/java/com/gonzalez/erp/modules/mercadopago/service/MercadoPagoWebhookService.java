package com.gonzalez.erp.modules.mercadopago.service;

/** Avisos de pago de Mercado Pago, ya con la firma comprobada. */
public interface MercadoPagoWebhookService {

    /**
     * Consulta el pago en Mercado Pago con la cuenta de la empresa y, si está aprobado, lo acredita
     * en su pedido (o lo devuelve si el pedido ya no lo espera). Repetir el aviso no cambia nada.
     * Falla con {@code MercadoPagoException} si Mercado Pago no responde: el aviso se reintenta.
     *
     * @param mpUserId  la cuenta de Mercado Pago que cobró ({@code user_id} del aviso).
     * @param paymentId el pago ({@code data.id} del aviso).
     */
    void handlePayment(long mpUserId, String paymentId);
}
