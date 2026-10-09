package com.gonzalez.erp.modules.orders.dto.request;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record OrderRequest(
        @NotNull(message = "branchId is required")
        Long branchId,

        Long customerId,

        @NotNull(message = "salesType is required")
        SalesType salesType,

        BigDecimal quickSaleAmount,

        @NotNull(message = "deliveryType is required")
        DeliveryType deliveryType,

        List<@Valid OrderItemRequest> items,

        // Aplica el saldo a favor disponible del cliente a esta orden.
        Boolean applyCredit,

        // Pago cobrado al crear la orden; se asigna a esta orden.
        @Valid InitialPaymentRequest initialPayment
) {
}
