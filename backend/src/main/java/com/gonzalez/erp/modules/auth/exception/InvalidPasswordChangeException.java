package com.gonzalez.erp.modules.auth.exception;

import lombok.Getter;

/**
 * Cambio de contraseña rechazado. Responde 400 y no 401 a propósito: un 401 haría que el
 * frontend diera la sesión por expirada.
 */
@Getter
public class InvalidPasswordChangeException extends RuntimeException {

    private final String code;

    private InvalidPasswordChangeException(String message, String code) {
        super(message);
        this.code = code;
    }

    public static InvalidPasswordChangeException wrongCurrentPassword() {
        return new InvalidPasswordChangeException("Current password is incorrect", "INVALID_CURRENT_PASSWORD");
    }

    public static InvalidPasswordChangeException managedByAdmin() {
        return new InvalidPasswordChangeException(
                "This account's password is managed by an administrator", "PASSWORD_MANAGED_BY_ADMIN");
    }

    public static InvalidPasswordChangeException sameAsCurrent() {
        return new InvalidPasswordChangeException(
                "New password must be different from the current one", "PASSWORD_UNCHANGED");
    }
}
