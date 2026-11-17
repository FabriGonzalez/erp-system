package com.gonzalez.erp.modules.store.dto;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Un pedido en el listado de "Mis pedidos".
 *
 * @param units         unidades compradas, sueltas y dentro de promos.
 * @param coverImageUrl la foto de la primera línea, o null si su producto no tiene fotos.
 */
public record StoreOrderSummaryResponse(
        Long id,
        String orderNumber,
        Instant createdAt,
        StoreOrderStatus status,
        DeliveryType deliveryType,
        int units,
        BigDecimal total,
        String coverImageUrl
) {}
