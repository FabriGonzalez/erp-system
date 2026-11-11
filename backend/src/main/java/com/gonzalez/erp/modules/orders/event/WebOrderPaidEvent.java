package com.gonzalez.erp.modules.orders.event;

import com.gonzalez.erp.modules.orders.entity.Order;

/**
 * Se acreditó el pago de un pedido de la tienda. Se publica dentro de la transacción del pago:
 * quien lo escucha de forma síncrona todavía puede leer el pedido y sus líneas.
 */
public record WebOrderPaidEvent(Order order) {}
