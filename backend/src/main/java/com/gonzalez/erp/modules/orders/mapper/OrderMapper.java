package com.gonzalez.erp.modules.orders.mapper;

import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.orders.dto.response.OrderItemResponse;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderItem;

public final class OrderMapper {

    private OrderMapper() {}

    public static OrderResponse toResponse(Order order) {
        Customer customer = order.getCustomer();
        return new OrderResponse(
                order.getId(),
                order.getBranch().getId(),
                order.getBranch().getName(),
                customer != null ? customer.getId() : null,
                customer != null ? customerName(customer) : null,
                order.getCreatedBy().getId(),
                order.getCreatedBy().getUsername(),
                order.getStatus(),
                order.getConfirmedAt(),
                order.getCancelledAt(),
                order.getItems().stream()
                        .map(OrderMapper::toItemResponse)
                        .toList(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    private static String customerName(Customer customer) {
        String firstName = customer.getFirstName() == null ? "" : customer.getFirstName().trim();
        String lastName = customer.getLastName() == null ? "" : customer.getLastName().trim();
        if (firstName.isEmpty() && lastName.isEmpty()) {
            return null;
        }
        return (firstName + " " + lastName).trim();
    }

    private static OrderItemResponse toItemResponse(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getUnitPrice()
        );
    }
}
