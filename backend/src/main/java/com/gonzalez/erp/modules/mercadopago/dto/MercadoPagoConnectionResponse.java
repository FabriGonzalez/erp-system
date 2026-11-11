package com.gonzalez.erp.modules.mercadopago.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Estado de la conexión para el panel. Sin tokens. {@code available} = la plataforma tiene
 * Mercado Pago configurado (si no, el botón "Conectar" no tiene sentido).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record MercadoPagoConnectionResponse(
        boolean available,
        boolean connected,
        Long mpUserId,
        Boolean liveMode,
        Instant connectedAt,
        Instant expiresAt
) {
    public static MercadoPagoConnectionResponse notConnected(boolean available) {
        return new MercadoPagoConnectionResponse(available, false, null, null, null, null);
    }
}
