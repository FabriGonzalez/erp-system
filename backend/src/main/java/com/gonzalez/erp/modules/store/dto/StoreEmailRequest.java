package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Pedidos que solo llevan el email (reenviar la verificación; en el paso 3b, olvidé la contraseña). */
public record StoreEmailRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        @Size(max = 100, message = "email must not exceed 100 characters")
        String email
) {}
