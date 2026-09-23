package com.gonzalez.erp.modules.orders.dto.request;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;

public record OrderUpdateRequest(
        Long branchId,

        Long customerId,

        SalesType salesType,

        BigDecimal quickSaleAmount,

        DeliveryType deliveryType,

        List<@Valid OrderItemRequest> items
) {
}