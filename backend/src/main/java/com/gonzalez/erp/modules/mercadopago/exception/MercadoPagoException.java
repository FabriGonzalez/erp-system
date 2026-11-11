package com.gonzalez.erp.modules.mercadopago.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Errores de la integración con Mercado Pago, con su código para que el panel sepa qué mostrar. */
@Getter
public class MercadoPagoException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    private MercadoPagoException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    /** La plataforma no tiene MERCADOPAGO_CLIENT_ID. */
    public static MercadoPagoException disabled() {
        return new MercadoPagoException(HttpStatus.SERVICE_UNAVAILABLE, "MERCADOPAGO_DISABLED",
                "Mercado Pago is not enabled");
    }

    /** La cuenta ya está conectada a otra empresa. */
    public static MercadoPagoException accountInUse() {
        return new MercadoPagoException(HttpStatus.CONFLICT, "MERCADOPAGO_ACCOUNT_IN_USE",
                "This Mercado Pago account is already connected to another company");
    }

    /** State vencido, alterado o inventado: no se distingue cuál. */
    public static MercadoPagoException invalidState() {
        return new MercadoPagoException(HttpStatus.BAD_REQUEST, "MERCADOPAGO_INVALID_STATE",
                "The connection link is invalid or has expired");
    }

    /** Mercado Pago rechazó el código o no respondió. */
    public static MercadoPagoException connectionFailed() {
        return new MercadoPagoException(HttpStatus.BAD_GATEWAY, "MERCADOPAGO_CONNECTION_FAILED",
                "Could not connect the Mercado Pago account");
    }
}
