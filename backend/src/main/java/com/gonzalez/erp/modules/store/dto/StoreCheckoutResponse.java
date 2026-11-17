package com.gonzalez.erp.modules.store.dto;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * El pedido creado, esperando el pago.
 *
 * @param fulfillment  MULTIPLE_BRANCHES si sale de varias sucursales: el sitio avisa que puede demorar.
 * @param pickupBranch solo en retiro.
 * @param paymentUrl       pantalla de pago de Mercado Pago; null si ya no espera el pago o la reserva venció.
 * @param paymentExpiresAt hasta cuándo se puede pagar (vence la reserva del stock).
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
        String paymentUrl,
        Instant paymentExpiresAt
) {}
