package com.gonzalez.erp.modules.store.dto;

/** Lo primero que pide la tienda: confirma que existe y cómo se llama. Sin datos internos. */
public record StoreInfoResponse(
        String name,
        String domain
) {}
