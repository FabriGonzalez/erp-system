package com.gonzalez.erp.modules.customers.dto.response;

import java.time.LocalDateTime;

public record AddressResponse(
        Long id,
        String street,
        String number,
        String apartment,
        String floor,
        String city,
        String state,
        String postalCode,
        String country,
        String reference,
        boolean primary,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
