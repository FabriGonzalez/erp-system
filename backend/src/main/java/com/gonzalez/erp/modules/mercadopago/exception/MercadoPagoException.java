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

    /** No llegó el código en el callback. */
    public static MercadoPagoException connectionFailed() {
        return new MercadoPagoException(HttpStatus.BAD_GATEWAY, "MERCADOPAGO_CONNECTION_FAILED",
                "Could not connect the Mercado Pago account");
    }

    /** Mercado Pago dijo que no (código vencido, permiso revocado): reintentar no sirve. */
    public static MercadoPagoException rejected() {
        return new MercadoPagoException(HttpStatus.BAD_GATEWAY, "MERCADOPAGO_REJECTED",
                "Mercado Pago rejected the request");
    }

    /** Mercado Pago no respondió o falló de su lado: puede andar más tarde. */
    public static MercadoPagoException unavailable() {
        return new MercadoPagoException(HttpStatus.BAD_GATEWAY, "MERCADOPAGO_UNAVAILABLE",
                "Mercado Pago is not responding");
    }

    public boolean isRejected() {
        return "MERCADOPAGO_REJECTED".equals(code);
    }
}
