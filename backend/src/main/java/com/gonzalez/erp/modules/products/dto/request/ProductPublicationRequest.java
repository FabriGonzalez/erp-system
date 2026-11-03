package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.constraints.NotNull;

public record ProductPublicationRequest(
        @NotNull(message = "publishedOnline is required")
        Boolean publishedOnline
) {}
