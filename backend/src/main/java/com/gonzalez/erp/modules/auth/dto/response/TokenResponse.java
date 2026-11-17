package com.gonzalez.erp.modules.auth.dto.response;

/**
 * Token nuevo tras cambiar la contraseña (el cambio revoca los anteriores, incluido
 * el de la sesión que hizo el cambio) o al renovar la sesión.
 */
public record TokenResponse(
        String token,
        String type
) {}
