package com.gonzalez.erp.modules.shipments.dto.response;

import java.time.Instant;

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
        Instant createdAt,
        Instant updatedAt
) {
}
