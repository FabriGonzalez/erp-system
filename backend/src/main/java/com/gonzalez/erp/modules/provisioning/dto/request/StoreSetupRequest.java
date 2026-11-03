package com.gonzalez.erp.modules.provisioning.dto.request;

import com.gonzalez.erp.modules.store.web.StoreDomains;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Dominio y habilitación de la tienda de una empresa: los carga solo el operador. */
public record StoreSetupRequest(
        // Vacío = la empresa queda sin tienda. Se guarda normalizado ("https://Tienda.com/" → tienda.com).
        @Size(max = 255, message = "Store domain must not exceed 255 characters")
        String storeDomain,

        @NotNull(message = "storeEnabled is required")
        Boolean storeEnabled
) {
    @AssertTrue(message = "Store domain is not a valid domain")
    public boolean isStoreDomainValid() {
        return storeDomain == null || storeDomain.isBlank() || StoreDomains.normalize(storeDomain).isPresent();
    }

    @AssertTrue(message = "A store cannot be enabled without a domain")
    public boolean isDomainPresentWhenEnabled() {
        return !Boolean.TRUE.equals(storeEnabled) || (storeDomain != null && !storeDomain.isBlank());
    }
}
