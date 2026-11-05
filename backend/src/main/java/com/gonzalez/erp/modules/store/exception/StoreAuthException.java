package com.gonzalez.erp.modules.store.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Errores de las cuentas de la tienda con su código, para que el sitio sepa qué mostrar. */
@Getter
public class StoreAuthException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    private StoreAuthException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    /** Contraseña correcta de un registro que todavía no tocó el link del mail. */
    public static StoreAuthException emailNotVerified() {
        return new StoreAuthException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED",
                "Email not verified. Check your inbox or request a new link");
    }

    /** Link vencido, ya usado, de otra tienda o inventado: no se distingue cuál. */
    public static StoreAuthException invalidLink() {
        return new StoreAuthException(HttpStatus.BAD_REQUEST, "INVALID_LINK", "The link is invalid or has expired");
    }
}
