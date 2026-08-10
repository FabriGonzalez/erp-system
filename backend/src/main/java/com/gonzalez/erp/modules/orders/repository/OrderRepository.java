package com.gonzalez.erp.modules.orders.repository;

import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStatus(OrderStatus status);
}
