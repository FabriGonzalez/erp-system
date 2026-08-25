package com.gonzalez.erp.modules.shipments.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.shipments.dto.request.ShipmentRequest;
import com.gonzalez.erp.modules.shipments.dto.response.ShipmentResponse;
import com.gonzalez.erp.modules.shipments.entity.Shipment;
import com.gonzalez.erp.modules.shipments.exception.InvalidShipmentException;
import com.gonzalez.erp.modules.shipments.exception.OrderAlreadyHasShipmentException;
import com.gonzalez.erp.modules.shipments.mapper.ShipmentMapper;
import com.gonzalez.erp.modules.shipments.repository.ShipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShipmentServiceImpl implements ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;

    @Override
    @Transactional
    public ShipmentResponse create(Long orderId, ShipmentRequest request) {
        Order order = findOrderOrThrow(orderId);

        if (!order.isDraft()) {
            throw new InvalidShipmentException(
                    "Shipment can only be created for draft orders");
        }

        if (shipmentRepository.existsByOrderId(orderId)) {
            throw new OrderAlreadyHasShipmentException(
                    "Order already has a shipment with id: " + orderId);
        }

        Shipment shipment = Shipment.builder()
                .order(order)
                .street(trim(request.street()))
                .number(trim(request.number()))
                .apartment(trim(request.apartment()))
                .floor(trim(request.floor()))
                .city(trim(request.city()))
                .state(trim(request.state()))
                .postalCode(trim(request.postalCode()))
                .country(trim(request.country()))
                .reference(trim(request.reference()))
                .build();

        Shipment saved = shipmentRepository.saveAndFlush(shipment);

        return ShipmentMapper.toResponse(saved);
    }

    @Override
    public ShipmentResponse findByOrderId(Long orderId) {
        findOrderOrThrow(orderId);

        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shipment not found for order id: " + orderId));

        return ShipmentMapper.toResponse(shipment);
    }

    @Override
    @Transactional
    public ShipmentResponse update(Long orderId, ShipmentRequest request) {
        Order order = findOrderOrThrow(orderId);

        if (!order.isDraft()) {
            throw new InvalidShipmentException(
                    "Shipment can only be updated while the order is in DRAFT");
        }

        Shipment shipment = shipmentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Shipment not found for order id: " + orderId));

        shipment.update(
                trim(request.street()),
                trim(request.number()),
                trim(request.apartment()),
                trim(request.floor()),
                trim(request.city()),
                trim(request.state()),
                trim(request.postalCode()),
                trim(request.country()),
                trim(request.reference())
        );

        return ShipmentMapper.toResponse(shipment);
    }

    private Order findOrderOrThrow(Long orderId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return orderRepository.findById(orderId)
                .filter(order -> order.getCompany() != null
                        && companyId.equals(order.getCompany().getId()))
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Order not found with id: " + orderId));
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}