package com.gonzalez.erp.modules.store.dto;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;

/**
 * Estado del pedido como lo ve el comprador. Agrupa los del ERP para que los internos (como
 * TO_ASSIGN) no lleguen al sitio y un cambio de estados en el ERP no rompa la tienda.
 */
public enum StoreOrderStatus {
    AWAITING_PAYMENT,
    PREPARING,
    READY_FOR_PICKUP,
    SHIPPED,
    CANCELLED;

    public static StoreOrderStatus from(OrderStatus status, DeliveryType deliveryType) {
        return switch (status) {
            case PENDING_PAYMENT -> AWAITING_PAYMENT;
            case TO_ASSIGN, TO_PREPARE -> PREPARING;
            // Un retiro pagado queda confirmado esperando al comprador (marcarlo retirado va en 22D).
            case CONFIRMED -> deliveryType == DeliveryType.LOCAL_PICKUP ? READY_FOR_PICKUP : PREPARING;
            case SHIPPED -> SHIPPED;
            case CANCELLED -> CANCELLED;
        };
    }
}
