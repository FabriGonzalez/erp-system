package com.gonzalez.erp.modules.store.web;

import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * La tienda del request, resuelta por StoreResolutionFilter. Es el equivalente de SecurityUtils
 * para /store/**: la empresa sale del dominio, nunca de un token de empleado.
 */
public record CurrentStore(Long companyId, String name, String domain) {

    static final String ATTRIBUTE = CurrentStore.class.getName();

    public static CurrentStore require() {
        Object store = RequestContextHolder.currentRequestAttributes()
                .getAttribute(ATTRIBUTE, RequestAttributes.SCOPE_REQUEST);
        if (!(store instanceof CurrentStore current)) {
            throw new IllegalStateException("No store resolved for this request");
        }
        return current;
    }
}
