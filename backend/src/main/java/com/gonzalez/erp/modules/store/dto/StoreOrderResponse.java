package com.gonzalez.erp.modules.store.dto;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Detalle de un pedido web para su comprador. Lleva los precios cobrados, no los actuales, y
 * nada de pagos, saldo, notas ni SKU.
 *
 * @param cancellable     true mientras se puede cancelar desde la tienda (sin pagar).
 * @param fulfillment     MULTIPLE_BRANCHES si sale de varias sucursales: el sitio avisa que puede demorar.
 * @param pickupBranch    solo en retiro.
 * @param shippingAddress solo en envío: la dirección como quedó al comprar.
 * @param paymentUrl      null hasta que exista el cobro con Mercado Pago.
 */
public record StoreOrderResponse(
        Long id,
        String orderNumber,
        Instant createdAt,
        StoreOrderStatus status,
        boolean cancellable,
        Instant cancelledAt,
        DeliveryType deliveryType,
        StoreFulfillment fulfillment,
        StoreCartQuoteResponse.PickupBranch pickupBranch,
        ShippingAddress shippingAddress,
        List<Item> items,
        List<Promo> promos,
        BigDecimal subtotal,
        BigDecimal shippingCost,
        BigDecimal total,
        String paymentUrl
) {
    public record Item(
            Long productId,
            Long productVariantId,
            String productName,
            List<StoreProductResponse.Attribute> attributes,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            String imageUrl
    ) {}

    /** name y unitPrice como se vendieron, aunque la promo haya cambiado después. */
    public record Promo(
            Long promotionId,
            String name,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            List<Component> components
    ) {}

    /** quantity = unidades por cada promo. */
    public record Component(
            Long productId,
            Long productVariantId,
            String productName,
            List<StoreProductResponse.Attribute> attributes,
            int quantity,
            String imageUrl
    ) {}

    public record ShippingAddress(
            String street,
            String number,
            String apartment,
            String floor,
            String city,
            String state,
            String postalCode,
            String country,
            String reference
    ) {}
}
