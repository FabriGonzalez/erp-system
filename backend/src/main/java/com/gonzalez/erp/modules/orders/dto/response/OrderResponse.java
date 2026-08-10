package com.gonzalez.erp.modules.orders.dto.response;

import com.gonzalez.erp.modules.orders.entity.OrderStatus;

import java.time.LocalDateTime;
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
        LocalDateTime confirmedAt,
        LocalDateTime cancelledAt,
        List<OrderItemResponse> items,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
