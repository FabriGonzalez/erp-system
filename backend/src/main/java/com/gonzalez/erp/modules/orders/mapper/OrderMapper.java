package com.gonzalez.erp.modules.orders.mapper;

import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.orders.dto.response.OrderItemResponse;
import com.gonzalez.erp.modules.orders.dto.response.OrderPromoResponse;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;
import com.gonzalez.erp.modules.orders.entity.OrderPromo;
import com.gonzalez.erp.modules.orders.entity.OrderPromoComponent;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.promotions.mapper.PromotionMapper;
import com.gonzalez.erp.modules.shipments.entity.Shipment;
import com.gonzalez.erp.modules.shipments.mapper.ShipmentMapper;

import java.math.BigDecimal;

public final class OrderMapper {

    private OrderMapper() {}

    public static OrderResponse toResponse(
            Order order,
            Shipment shipment,
            BigDecimal amountPaid,
            PaymentStatus paymentStatus,
            BigDecimal balance
    ) {
        Customer customer = order.getCustomer();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getBranch().getId(),
                order.getBranch().getName(),
                customer != null ? customer.getId() : null,
                customer != null ? customerName(customer) : null,
                order.getCreatedBy().getId(),
                order.getCreatedBy().getUsername(),
                order.getSalesType(),
                order.getQuickSaleAmount(),
                order.getDeliveryType(),
                shipment != null ? ShipmentMapper.toResponse(shipment) : null,
                order.getStatus(),
                order.getTotal(),
                amountPaid,
                paymentStatus,
                balance,
                order.getConfirmedAt(),
                order.getPreparedAt(),
                order.getShippedAt(),
                order.getCancelledAt(),
                order.getItems().stream()
                        .map(OrderMapper::toItemResponse)
                        .toList(),
                order.getPromos().stream()
                        .map(OrderMapper::toPromoResponse)
                        .toList(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    public static PaymentStatus computePaymentStatus(
            BigDecimal total,
            BigDecimal amountPaid
    ) {
        if (total == null || total.compareTo(BigDecimal.ZERO) == 0) {
            return PaymentStatus.PENDING;
        }

        if (amountPaid == null || amountPaid.compareTo(BigDecimal.ZERO) <= 0) {
            return PaymentStatus.PENDING;
        }

        if (amountPaid.compareTo(total) >= 0) {
            return PaymentStatus.PAID;
        }

        return PaymentStatus.PARTIAL;
    }

    private static String customerName(Customer customer) {
        String firstName = customer.getFirstName() == null
                ? ""
                : customer.getFirstName().trim();

        String lastName = customer.getLastName() == null
                ? ""
                : customer.getLastName().trim();

        if (firstName.isEmpty() && lastName.isEmpty()) {
            return null;
        }

        return (firstName + " " + lastName).trim();
    }

    private static OrderPromoResponse toPromoResponse(OrderPromo promo) {
        return new OrderPromoResponse(
                promo.getId(),
                promo.getPromotion().getId(),
                promo.getName(),
                promo.getUnitPrice(),
                promo.getQuantity(),
                promo.getComponents().stream()
                        .map(OrderMapper::toPromoComponent)
                        .toList()
        );
    }

    private static OrderPromoResponse.Component toPromoComponent(OrderPromoComponent component) {
        ProductVariant variant = component.getProductVariant();
        return new OrderPromoResponse.Component(
                variant.getProduct().getId(),
                variant.getProduct().getName(),
                variant.getId(),
                variant.getSku(),
                PromotionMapper.variantName(variant),
                component.getQuantity()
        );
    }

    private static OrderItemResponse toItemResponse(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProductVariant().getProduct().getId(),
                item.getProductVariant().getProduct().getName(),
                item.getProductVariant().getId(),
                item.getProductVariant().getSku(),
                item.getQuantity(),
                item.getUnitPrice()
        );
    }
}