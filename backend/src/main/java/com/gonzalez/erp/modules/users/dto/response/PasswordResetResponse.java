package com.gonzalez.erp.modules.users.dto.response;

/** La contraseña temporal se devuelve una sola vez; no queda guardada en texto plano. */
public record PasswordResetResponse(
        Long userId,
        String username,
        String temporaryPassword
) {}
