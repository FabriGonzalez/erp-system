package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** El token que llegó en el link del mail (el sitio lo lee de la URL y lo manda acá). */
public record StoreLinkTokenRequest(
        @NotBlank(message = "token is required")
        @Size(max = 100, message = "token must not exceed 100 characters")
        String token
) {}
