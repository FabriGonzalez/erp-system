package com.gonzalez.erp.modules.mercadopago.client;

/** Endpoint de tokens de Mercado Pago. */
public interface MercadoPagoOAuthClient {

    /**
     * Cambia el código que Mercado Pago manda al callback (vale 10 minutos y una sola vez) por los
     * tokens de la cuenta que lo autorizó. Falla con {@code MercadoPagoException} si Mercado Pago
     * lo rechaza o no responde.
     */
    Tokens exchangeCode(String code, String codeVerifier);

    record Tokens(String accessToken, String refreshToken, long expiresInSeconds, long userId, boolean liveMode) {

        // Sin los secretos: el toString de un record los imprimiría en cualquier log.
        @Override
        public String toString() {
            return "Tokens[userId=" + userId + ", liveMode=" + liveMode + ", expiresInSeconds=" + expiresInSeconds + "]";
        }
    }
}
