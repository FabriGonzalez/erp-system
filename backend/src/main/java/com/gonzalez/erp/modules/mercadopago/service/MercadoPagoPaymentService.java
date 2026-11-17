package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoCheckoutClient.PreferenceRequest;

/** Cobros con la cuenta de Mercado Pago de cada empresa. */
public interface MercadoPagoPaymentService {

    /** Hay Mercado Pago en la plataforma y la cuenta de la empresa está conectada y vigente. */
    boolean canCharge(Long companyId);

    /**
     * Arma el cobro con el token de la empresa. Falla con {@code MercadoPagoException} si la
     * cuenta dejó de estar vigente o Mercado Pago no lo crea.
     */
    PaymentLink createPaymentLink(Long companyId, PreferenceRequest request);

    /**
     * Vence el link de un pedido cancelado para que no se pueda pagar. Sin garantía: si Mercado
     * Pago no responde solo queda un log, y un pago que igual entre se devuelve en el webhook.
     */
    void expirePaymentLink(Long companyId, String preferenceId);

    /**
     * Devuelve entero un pago de la empresa. Falla con {@code MercadoPagoException}: rechazada si la
     * empresa no tiene la cuenta conectada o Mercado Pago dijo que no, y no disponible si no respondió.
     */
    void refundPayment(Long companyId, String mpPaymentId);

    record PaymentLink(String preferenceId, String url) {}
}
