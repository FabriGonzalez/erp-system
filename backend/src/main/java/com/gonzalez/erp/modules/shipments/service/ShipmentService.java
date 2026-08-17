package com.gonzalez.erp.modules.shipments.service;

import com.gonzalez.erp.modules.shipments.dto.request.ShipmentRequest;
import com.gonzalez.erp.modules.shipments.dto.response.ShipmentResponse;

public interface ShipmentService {

    ShipmentResponse create(Long orderId, ShipmentRequest request);

    ShipmentResponse findByOrderId(Long orderId);

    ShipmentResponse update(Long orderId, ShipmentRequest request);
}
