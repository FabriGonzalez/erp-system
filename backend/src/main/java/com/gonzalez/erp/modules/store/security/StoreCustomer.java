package com.gonzalez.erp.modules.store.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * El comprador logueado en /store/me/**, puesto por StoreCustomerAuthFilter. Es el equivalente
 * de SecurityUtils para la tienda: la cuenta sale del token, nunca de la URL ni del cuerpo.
 */
public record StoreCustomer(Long accountId, Long customerId, Long companyId) {

    public static StoreCustomer require() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof StoreCustomer customer) {
            return customer;
        }
        throw new IllegalStateException("No store customer authenticated for this request");
    }
}
