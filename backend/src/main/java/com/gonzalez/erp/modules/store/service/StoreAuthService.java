package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.store.dto.StoreLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreMeResponse;
import com.gonzalez.erp.modules.store.dto.StoreRegisterRequest;
import com.gonzalez.erp.modules.store.dto.StoreTokenResponse;

/** Cuentas de comprador de la tienda del request (CurrentStore). */
public interface StoreAuthService {

    /**
     * Deja el registro pendiente y manda el link de verificación. No dice si el email ya tenía
     * cuenta: responde igual y al dueño le llega un aviso.
     */
    void register(StoreRegisterRequest request, String clientIp);

    /** Crea la cuenta y la ficha WEB con los datos del registro de ese link. */
    void verifyEmail(String token);

    /** Link nuevo para el último registro pendiente del email. No dice si existe. */
    void resendVerification(String email, String clientIp);

    StoreTokenResponse login(StoreLoginRequest request, String clientIp);

    StoreMeResponse me();
}
