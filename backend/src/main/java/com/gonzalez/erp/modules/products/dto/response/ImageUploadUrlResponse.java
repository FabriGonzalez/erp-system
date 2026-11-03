package com.gonzalez.erp.modules.products.dto.response;

import java.time.Instant;

/** El cliente sube con PUT a uploadUrl, con los headers Content-Type y Content-Length declarados. */
public record ImageUploadUrlResponse(
        String storageKey,
        String uploadUrl,
        String contentType,
        Instant expiresAt
) {}
