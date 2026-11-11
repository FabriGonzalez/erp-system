package com.gonzalez.erp.modules.mercadopago.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Datos de la app de Mercado Pago de la plataforma (una sola para todas las empresas: cada empresa
 * la autoriza a operar con su cuenta). Sin client ID, la integración está deshabilitada.
 */
@Component
public class MercadoPagoProperties {

    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final boolean testMode;

    public MercadoPagoProperties(
            @Value("${app.mercadopago.client-id:}") String clientId,
            @Value("${app.mercadopago.client-secret:}") String clientSecret,
            @Value("${app.mercadopago.redirect-uri:}") String redirectUri,
            @Value("${app.mercadopago.test-mode:false}") boolean testMode) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.clientSecret = clientSecret == null ? "" : clientSecret.trim();
        this.redirectUri = redirectUri == null ? "" : redirectUri.trim();
        this.testMode = testMode;
        if (enabled() && (this.clientSecret.isEmpty() || this.redirectUri.isEmpty())) {
            throw new IllegalStateException(
                    "MERCADOPAGO_CLIENT_SECRET and MERCADOPAGO_REDIRECT_URI are required with MERCADOPAGO_CLIENT_ID");
        }
    }

    public boolean enabled() {
        return !clientId.isEmpty();
    }

    public String clientId() {
        return clientId;
    }

    public String clientSecret() {
        return clientSecret;
    }

    /** Tiene que coincidir exacto con una de las URL de redirección cargadas en la app de Mercado Pago. */
    public String redirectUri() {
        return redirectUri;
    }

    /** Credenciales de prueba: Mercado Pago entrega tokens del sandbox. */
    public boolean testMode() {
        return testMode;
    }
}
