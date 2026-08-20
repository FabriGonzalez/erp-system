package com.gonzalez.erp.modules.orders.dto.response;

import com.gonzalez.erp.modules.orders.entity.OrderStatus;

import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        Long branchId,
        String branchName,
        Long customerId,
        String customerName,
        Long createdById,
        String createdByUsername,
        OrderStatus status,
        Instant confirmedAt,
        Instant cancelledAt,
        List<OrderItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
}
