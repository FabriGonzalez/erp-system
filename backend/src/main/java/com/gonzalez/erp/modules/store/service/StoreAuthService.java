package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.store.dto.StoreLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreMeResponse;
import com.gonzalez.erp.modules.store.dto.StoreRegisterRequest;
import com.gonzalez.erp.modules.store.dto.StoreTokenResponse;

/** Cuentas de comprador de la tienda del request (CurrentStore). */
public interface StoreAuthService {

    /** No dice si el email ya tenía cuenta: responde igual en los dos casos. */
    void register(StoreRegisterRequest request);

    StoreTokenResponse login(StoreLoginRequest request, String clientIp);

    StoreMeResponse me();
}
