package com.gonzalez.erp.modules.store.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Links al sitio de una tienda (mails, vuelta desde Mercado Pago). En desarrollo,
 * STORE_LINK_SCHEME=http y STORE_LINK_PORT=3000.
 */
@Component
public class StoreSiteUrls {

    private final String scheme;
    private final String port;

    public StoreSiteUrls(
            @Value("${app.store.link-scheme}") String scheme,
            @Value("${app.store.link-port:}") String port) {
        this.scheme = scheme;
        this.port = port == null || port.isBlank() ? "" : ":" + port.trim();
    }

    // El dominio ya está validado como hostname (StoreDomains): no puede traer ruta ni otra URL.
    public String home(String storeDomain) {
        return scheme + "://" + storeDomain + port;
    }

    public String order(String storeDomain, Long orderId) {
        return home(storeDomain) + "/pedidos/" + orderId;
    }
}
