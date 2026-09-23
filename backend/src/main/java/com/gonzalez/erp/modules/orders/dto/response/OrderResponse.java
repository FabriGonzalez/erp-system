package com.gonzalez.erp.modules.orders.dto.response;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        String orderNumber,
        Long branchId,
        String branchName,
        Long customerId,
        String customerName,
        Long createdById,
        String createdByUsername,
        SalesType salesType,
        BigDecimal quickSaleAmount,
        DeliveryType deliveryType,
        OrderStatus status,
        BigDecimal total,
        BigDecimal amountPaid,
        PaymentStatus paymentStatus,
        BigDecimal balance,
        Instant confirmedAt,
        Instant preparedAt,
        Instant shippedAt,
        Instant cancelledAt,
        Instant returnedAt,
        List<OrderItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
}