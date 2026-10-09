package com.gonzalez.erp.modules.orders.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.orders.dto.request.OrderCancelRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import org.springframework.data.domain.Pageable;

public interface OrderService {

    PageResponse<OrderResponse> findAll(OrderStatus status, Long branchId, SalesType salesType,
                                        DeliveryType deliveryType, Long customerId,
                                        PaymentStatus paymentStatus, String query, Pageable pageable);

    OrderResponse findById(Long id);

    OrderResponse create(OrderRequest request);

    OrderResponse update(Long id, OrderUpdateRequest request);

    OrderResponse dispatch(Long id);

    OrderResponse cancel(Long id, OrderCancelRequest request);
}