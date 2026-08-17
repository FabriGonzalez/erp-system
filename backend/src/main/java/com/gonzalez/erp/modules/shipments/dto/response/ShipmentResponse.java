package com.gonzalez.erp.modules.shipments.dto.response;

import java.time.LocalDateTime;

public record ShipmentResponse(
        Long id,
        Long orderId,
        String street,
        String number,
        String apartment,
        String floor,
        String city,
        String state,
        String postalCode,
        String country,
        String reference,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
