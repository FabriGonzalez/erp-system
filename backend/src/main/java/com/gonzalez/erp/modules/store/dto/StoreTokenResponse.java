package com.gonzalez.erp.modules.store.dto;

/** Token del comprador: va en Authorization: Bearer para /store/me/**. Vence a los 7 días. */
public record StoreTokenResponse(String token, String type) {

    public static StoreTokenResponse bearer(String token) {
        return new StoreTokenResponse(token, "Bearer");
    }
}
