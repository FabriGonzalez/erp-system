package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Token del link de recuperación y la contraseña nueva, con la misma regla que el registro. */
public record StoreResetPasswordRequest(
        @NotBlank(message = "token is required")
        @Size(max = 100, message = "token must not exceed 100 characters")
        String token,

        @NotBlank(message = "password is required")
        @Size(min = 8, max = 72, message = "password must be between 8 and 72 characters")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d).+$", message = "password must contain letters and numbers")
        String password
) {}
