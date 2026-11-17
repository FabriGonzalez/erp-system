package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * El formulario completo de "Mi perfil": representa cómo queda el perfil, así que un teléfono
 * vacío o ausente lo borra. El email no se cambia.
 */
public record StoreUpdateProfileRequest(
        @NotBlank(message = "firstName is required")
        @Size(max = 100, message = "firstName must not exceed 100 characters")
        String firstName,

        @NotBlank(message = "lastName is required")
        @Size(max = 100, message = "lastName must not exceed 100 characters")
        String lastName,

        @Size(max = 30, message = "phone must not exceed 30 characters")
        String phone
) {}
