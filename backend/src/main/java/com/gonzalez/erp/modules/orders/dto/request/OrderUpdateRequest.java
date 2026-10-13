package com.gonzalez.erp.modules.orders.dto.request;

import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;

public record OrderUpdateRequest(
        BigDecimal quickSaleAmount,

        List<@Valid OrderItemRequest> items,

        // Solo pedidos SHIPPING: cambia la dirección de entrega. Null la deja como está.
        Long shippingAddressId
) {
}
