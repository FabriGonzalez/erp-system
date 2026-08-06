package com.gonzalez.erp.modules.customers.dto.response;

import java.time.LocalDateTime;

public record CustomerResponse(
        Long id,
        Long customerId,
        String firstName,
        String lastName,
        String phone,
        String email,
        String documentType,
        String documentNumber,
        String observations,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
