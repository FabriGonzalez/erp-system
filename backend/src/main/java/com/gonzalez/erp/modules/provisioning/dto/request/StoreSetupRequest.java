package com.gonzalez.erp.modules.provisioning.dto.request;

import com.gonzalez.erp.modules.store.web.StoreDomains;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Dominio, habilitación y remitente de la tienda de una empresa: los carga solo el operador. Es la
 * configuración completa: lo que no viene queda vacío.
 */
public record StoreSetupRequest(
        // Vacío = la empresa queda sin tienda. Se guarda normalizado ("https://Tienda.com/" → tienda.com).
        @Size(max = 255, message = "Store domain must not exceed 255 characters")
        String storeDomain,

        @NotNull(message = "storeEnabled is required")
        Boolean storeEnabled,

        // Vacío = los mails salen de MAIL_FROM. No se exige que sea del dominio de la tienda: lo
        // que importa es que ese dominio tenga SPF/DKIM del proveedor de mail.
        @Email(message = "Store mail sender must be a valid email")
        @Size(max = 254, message = "Store mail sender must not exceed 254 characters")
        String storeMailFrom
) {
    // Corre al leer el JSON, antes de validar: @Email ve el remitente sin espacios y vacío = null.
    public StoreSetupRequest {
        if (storeMailFrom != null) {
            storeMailFrom = storeMailFrom.isBlank() ? null : storeMailFrom.trim();
        }
    }

    @AssertTrue(message = "Store domain is not a valid domain")
    public boolean isStoreDomainValid() {
        return storeDomain == null || storeDomain.isBlank() || StoreDomains.normalize(storeDomain).isPresent();
    }

    @AssertTrue(message = "A store cannot be enabled without a domain")
    public boolean isDomainPresentWhenEnabled() {
        return !Boolean.TRUE.equals(storeEnabled) || (storeDomain != null && !storeDomain.isBlank());
    }
}
