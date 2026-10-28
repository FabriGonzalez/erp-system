package com.gonzalez.erp.modules.orders.dto.response;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.shipments.dto.response.ShipmentResponse;

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
        // Snapshot de la dirección de entrega; null en retiros y en envíos creados sin ella.
        ShipmentResponse shipment,
        OrderStatus status,
        BigDecimal total,
        BigDecimal amountPaid,
        PaymentStatus paymentStatus,
        BigDecimal balance,
        // Medio de una venta sin cliente; null con cliente y en ventas sin cliente anteriores.
        PaymentMethod paymentMethod,
        Instant confirmedAt,
        Instant preparedAt,
        Instant shippedAt,
        Instant cancelledAt,
        List<OrderItemResponse> items,
        List<OrderPromoResponse> promos,
        Instant createdAt,
        Instant updatedAt
) {
}