package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Registro en la tienda. La contraseña sigue la regla del ERP: 8 a 72, con letras y números. */
public record StoreRegisterRequest(
        @NotBlank(message = "firstName is required")
        @Size(max = 100, message = "firstName must not exceed 100 characters")
        String firstName,

        @NotBlank(message = "lastName is required")
        @Size(max = 100, message = "lastName must not exceed 100 characters")
        String lastName,

        @NotBlank(message = "email is required")
        @Email(message = "email must be valid")
        @Size(max = 100, message = "email must not exceed 100 characters")
        String email,

        // 72 es el límite de BCrypt: lo que pase de ahí no cuenta.
        @NotBlank(message = "password is required")
        @Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d).+$", message = "password must contain letters and numbers")
        String password,

        @Size(max = 30, message = "phone must not exceed 30 characters")
        String phone
) {}
