package com.gonzalez.erp.modules.store.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoreLoginRequest(
        @NotBlank(message = "email is required")
        @Size(max = 100, message = "email must not exceed 100 characters")
        String email,

        @NotBlank(message = "password is required")
        @Size(max = 72, message = "password must not exceed 72 characters")
        String password
) {}
