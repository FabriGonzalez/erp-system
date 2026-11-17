package com.gonzalez.erp.modules.customers.dto.response;

import java.time.Instant;

public record AddressResponse(
        Long id,
        String label,
        String street,
        String number,
        String apartment,
        String floor,
        String city,
        String state,
        String postalCode,
        String country,
        String reference,
        // Mismo nombre que en AddressRequest.
        boolean mainAddress,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
