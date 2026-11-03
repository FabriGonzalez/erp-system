package com.gonzalez.erp.modules.store.web;

import java.net.URI;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Dominio de una tienda en forma canónica: minúsculas, sin esquema, puerto ni ruta. Se compara
 * exacto: "www.tienda.com" y "tienda.com" son dominios distintos (la redirección la hace el hosting).
 */
public final class StoreDomains {

    private static final Pattern HOSTNAME = Pattern.compile(
            "^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$");

    private StoreDomains() {}

    /** Acepta un dominio suelto ("Tienda.com") o un origen ("https://tienda.com:443"). */
    public static Optional<String> normalize(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        String text = value.trim().toLowerCase(Locale.ROOT);
        String host;
        try {
            host = URI.create(text.contains("://") ? text : "http://" + text).getHost();
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (host == null) {
            return Optional.empty();
        }
        if (host.endsWith(".")) {
            host = host.substring(0, host.length() - 1);
        }
        return HOSTNAME.matcher(host).matches() ? Optional.of(host) : Optional.empty();
    }
}
