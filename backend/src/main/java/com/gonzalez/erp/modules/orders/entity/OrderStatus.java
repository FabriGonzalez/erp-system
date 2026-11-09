package com.gonzalez.erp.modules.orders.entity;

public enum OrderStatus {
    CONFIRMED,
    TO_PREPARE,
    SHIPPED,
    CANCELLED,
    // Pedido web esperando el pago; todavía no cuenta como venta ni como deuda.
    PENDING_PAYMENT,
    // Pedido web pagado que ninguna sucursal puede armar sola: lo resuelve un empleado.
    TO_ASSIGN
}
