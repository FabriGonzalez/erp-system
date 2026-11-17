package com.gonzalez.erp.modules.customers.dto.response;

import com.gonzalez.erp.modules.customers.entity.CustomerOrigin;

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
        // ERP o WEB (registrado en la tienda): el ERP lo muestra con la marca "Web".
        CustomerOrigin origin,
        // Resumen de direcciones activas: evita pedir las direcciones de cada cliente del listado.
        int addressCount,
        AddressResponse mainAddress,
        Instant createdAt,
        Instant updatedAt
) {}
