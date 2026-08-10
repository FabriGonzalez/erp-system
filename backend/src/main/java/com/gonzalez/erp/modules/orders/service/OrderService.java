package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;

import java.util.List;

public interface OrderService {

    List<OrderResponse> findAll(OrderStatus status);

    OrderResponse findById(Long id);

    OrderResponse create(OrderRequest request);

    OrderResponse confirm(Long id);

    OrderResponse cancel(Long id);
}
