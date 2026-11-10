package com.gonzalez.erp.modules.store.dto;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;

import java.math.BigDecimal;

/**
 * El pedido creado, esperando el pago.
 *
 * @param fulfillment  MULTIPLE_BRANCHES si sale de varias sucursales: el sitio avisa que puede demorar.
 * @param pickupBranch solo en retiro.
 * @param paymentUrl   null hasta que exista el cobro con Mercado Pago.
 */
public record StoreCheckoutResponse(
        Long orderId,
        String orderNumber,
        OrderStatus status,
        DeliveryType deliveryType,
        StoreFulfillment fulfillment,
        StoreCartQuoteResponse.PickupBranch pickupBranch,
        BigDecimal subtotal,
        BigDecimal shippingCost,
        BigDecimal total,
        String paymentUrl
) {}
