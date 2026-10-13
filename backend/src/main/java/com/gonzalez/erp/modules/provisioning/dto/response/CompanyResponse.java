package com.gonzalez.erp.modules.provisioning.dto.response;

import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.entity.CompanyStatus;

import java.time.Instant;

/** Vista de una empresa para el administrador de plataforma. */
public record CompanyResponse(
        Long id,
        String name,
        String legalName,
        String taxId,
        CompanyStatus status,
        String statusReason,
        Instant statusChangedAt,
        Instant createdAt
) {
    public static CompanyResponse from(Company company) {
        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getLegalName(),
                company.getTaxId(),
                company.getStatus(),
                company.getStatusReason(),
                company.getStatusChangedAt(),
                company.getCreatedAt()
        );
    }
}
