package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoreGoogleLoginRequest(
        @NotBlank(message = "idToken is required")
        @Size(max = 4096, message = "idToken must not exceed 4096 characters")
        String idToken
) {}
