package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;

import java.util.List;

public interface OrderService {

    List<OrderResponse> findAll(OrderStatus status, Long branchId, SalesType salesType, DeliveryType deliveryType);

    OrderResponse findById(Long id);

    OrderResponse create(OrderRequest request);

    OrderResponse update(Long id, OrderUpdateRequest request);

    OrderResponse ship(Long id);

    OrderResponse cancel(Long id);
}