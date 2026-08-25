package com.gonzalez.erp.modules.customers.dto.response;

import java.time.Instant;

public record CustomerResponse(
        Long id,
        String firstName,
        String lastName,
        String phone,
        String email,
        String documentType,
        String documentNumber,
        String observations,
        Long companyId,
        boolean active,
        Instant createdAt,
        Instant updatedAt
) {}
