package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.modules.mercadopago.dto.MercadoPagoConnectionResponse;

/** Conectar la cuenta de Mercado Pago de la empresa del usuario logueado (OAuth). */
public interface MercadoPagoConnectionService {

    MercadoPagoConnectionResponse getConnection();

    /** URL de Mercado Pago a la que se manda al admin para que autorice. Vale 10 minutos. */
    String startConnection();

    /**
     * Lo que pasa cuando Mercado Pago vuelve al callback (público: la empresa sale del state, no
     * de la sesión). Falla con {@code MercadoPagoException}.
     */
    void completeConnection(String code, String state);

    /** Solo de nuestro lado: la autorización la revoca el vendedor desde su cuenta de Mercado Pago. */
    void disconnect();
}
