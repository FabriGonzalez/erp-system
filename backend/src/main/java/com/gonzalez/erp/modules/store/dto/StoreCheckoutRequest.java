package com.gonzalez.erp.modules.store.dto;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * @param pickupBranchId solo con LOCAL_PICKUP: una de las sucursales que dio la cotización.
 * @param addressId      solo con SHIPPING: una dirección activa del comprador.
 * @param expectedTotal  el total de la cotización que vio el comprador, sin el envío.
 * @param checkoutKey    la genera el sitio por intento de compra; repetirla devuelve el mismo pedido.
 */
public record StoreCheckoutRequest(
        @NotNull(message = "cart is required")
        @Valid
        StoreCartRequest cart,

        @NotNull(message = "deliveryType is required")
        DeliveryType deliveryType,

        Long pickupBranchId,

        Long addressId,

        @NotNull(message = "expectedTotal is required")
        @DecimalMin(value = "0", message = "expectedTotal cannot be negative")
        BigDecimal expectedTotal,

        @NotBlank(message = "checkoutKey is required")
        @Size(min = 16, max = 64, message = "checkoutKey must have between 16 and 64 characters")
        String checkoutKey
) {}
