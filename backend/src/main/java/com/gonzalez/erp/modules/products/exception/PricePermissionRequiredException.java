package com.gonzalez.erp.modules.products.exception;

import org.springframework.security.access.AccessDeniedException;

/** Fijar o cambiar el precio de una variante exige ADMINISTRAR_PRECIOS. */
public class PricePermissionRequiredException extends AccessDeniedException {

    public PricePermissionRequiredException() {
        super("Setting a variant price requires ADMINISTRAR_PRECIOS");
    }
}
