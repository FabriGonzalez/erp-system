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

        // Dirección del cliente a la que se envía: obligatoria con SHIPPING, prohibida con LOCAL_PICKUP.
        Long shippingAddressId,

        List<@Valid OrderItemRequest> items,

        // Aplica el saldo a favor disponible del cliente a esta orden.
        Boolean applyCredit,

        // Pago cobrado al crear la orden; se asigna a esta orden.
        @Valid InitialPaymentRequest initialPayment,

        // Promos vigentes, sin repetir. WITH_PRODUCTS lleva al menos un ítem o una promo.
        List<@Valid OrderPromoRequest> promos
) {
}
