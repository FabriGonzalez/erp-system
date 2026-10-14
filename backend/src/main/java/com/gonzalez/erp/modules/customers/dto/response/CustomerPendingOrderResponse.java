package com.gonzalez.erp.modules.customers.dto.response;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;

import java.math.BigDecimal;
import java.time.Instant;

/** Orden del cliente con saldo pendiente, tal como la ve la cuenta corriente. */
public record CustomerPendingOrderResponse(
        Long orderId,
        String orderNumber,
        Long branchId,
        String branchName,
        OrderStatus status,
        SalesType salesType,
        DeliveryType deliveryType,
        BigDecimal total,
        BigDecimal amountPaid,
        BigDecimal balance,
        Instant createdAt
) {}
