package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.store.dto.StoreChangePasswordRequest;
import com.gonzalez.erp.modules.store.dto.StoreLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreMeResponse;
import com.gonzalez.erp.modules.store.dto.StoreRegisterRequest;
import com.gonzalez.erp.modules.store.dto.StoreResetPasswordRequest;
import com.gonzalez.erp.modules.store.dto.StoreTokenResponse;
import com.gonzalez.erp.modules.store.dto.StoreUpdateProfileRequest;

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

    /** Entra con la cuenta vinculada a ese id de Google; si no hay, vincula por email o crea una nueva. */
    StoreTokenResponse loginWithGoogle(String idToken);

    /**
     * Manda el link para elegir otra contraseña (1 h, un solo uso) y anula los anteriores.
     * No dice si el email tiene cuenta.
     */
    void forgotPassword(String email, String clientIp);

    /** Cambia la contraseña con el link del mail y cierra las sesiones abiertas. */
    void resetPassword(StoreResetPasswordRequest request);

    StoreMeResponse me();

    /** Formulario completo: nombre, apellido y teléfono. Documento y observaciones no se tocan. */
    StoreMeResponse updateProfile(StoreUpdateProfileRequest request);

    /** Cierra las demás sesiones y devuelve un token nuevo para que esta siga abierta. */
    StoreTokenResponse changePassword(StoreChangePasswordRequest request, String clientIp);
}
