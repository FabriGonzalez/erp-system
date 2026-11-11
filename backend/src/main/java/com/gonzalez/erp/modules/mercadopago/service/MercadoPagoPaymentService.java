package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoPreferenceClient.PreferenceRequest;

/** Cobros con la cuenta de Mercado Pago de cada empresa. */
public interface MercadoPagoPaymentService {

    /** Hay Mercado Pago en la plataforma y la cuenta de la empresa está conectada y vigente. */
    boolean canCharge(Long companyId);

    /**
     * Arma el cobro con el token de la empresa. Falla con {@code MercadoPagoException} si la
     * cuenta dejó de estar vigente o Mercado Pago no lo crea.
     */
    PaymentLink createPaymentLink(Long companyId, PreferenceRequest request);

    record PaymentLink(String preferenceId, String url) {}
}
