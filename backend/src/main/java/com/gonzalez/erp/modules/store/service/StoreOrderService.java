package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.store.dto.StoreOrderResponse;
import com.gonzalez.erp.modules.store.dto.StoreOrderSummaryResponse;

public interface StoreOrderService {

    /** Pedidos web del comprador logueado, los más nuevos primero. */
    PageResponse<StoreOrderSummaryResponse> findMine(int page, int size);

    StoreOrderResponse findMine(Long orderId);

    /** Cancela un pedido propio que todavía espera el pago y devuelve el stock reservado. */
    StoreOrderResponse cancelMine(Long orderId);
}
