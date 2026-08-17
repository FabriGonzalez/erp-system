package com.gonzalez.erp.modules.shipments.mapper;

import com.gonzalez.erp.modules.shipments.dto.response.ShipmentResponse;
import com.gonzalez.erp.modules.shipments.entity.Shipment;

public final class ShipmentMapper {

    private ShipmentMapper() {
    }

    public static ShipmentResponse toResponse(Shipment shipment) {
        return new ShipmentResponse(
                shipment.getId(),
                shipment.getOrder().getId(),
                shipment.getStreet(),
                shipment.getNumber(),
                shipment.getApartment(),
                shipment.getFloor(),
                shipment.getCity(),
                shipment.getState(),
                shipment.getPostalCode(),
                shipment.getCountry(),
                shipment.getReference(),
                shipment.getCreatedAt(),
                shipment.getUpdatedAt()
        );
    }
}
