package com.gonzalez.erp.modules.store.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/** Los campos de ErrorResponse más la cotización actual cuando el problema es el carrito. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record StoreCheckoutErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        String code,
        StoreCartQuoteResponse quote
) {}
