package com.gonzalez.erp.modules.orders.dto.request;

import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;

public record OrderUpdateRequest(
        BigDecimal quickSaleAmount,

        List<@Valid OrderItemRequest> items,

        // Solo pedidos SHIPPING: cambia la dirección de entrega. Null la deja como está.
        Long shippingAddressId,

        // Reemplaza las promos del pedido (null = ninguna, como items). Las que ya tenía
        // conservan su precio y sus componentes; una nueva tiene que estar vigente.
        List<@Valid OrderPromoRequest> promos
) {
}
