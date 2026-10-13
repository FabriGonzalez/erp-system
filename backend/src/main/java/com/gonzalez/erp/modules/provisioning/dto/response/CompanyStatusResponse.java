package com.gonzalez.erp.modules.provisioning.dto.response;

import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.entity.CompanyStatus;

import java.time.Instant;

public record CompanyStatusResponse(
        Long id,
        String name,
        CompanyStatus status,
        String statusReason,
        Instant statusChangedAt
) {
    public static CompanyStatusResponse from(Company company) {
        return new CompanyStatusResponse(
                company.getId(),
                company.getName(),
                company.getStatus(),
                company.getStatusReason(),
                company.getStatusChangedAt()
        );
    }
}
