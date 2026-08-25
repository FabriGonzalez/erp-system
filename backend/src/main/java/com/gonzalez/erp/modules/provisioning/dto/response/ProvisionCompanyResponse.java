package com.gonzalez.erp.modules.provisioning.dto.response;

public record ProvisionCompanyResponse(
        Long companyId,
        String companyName,
        String legalName,
        String taxId,
        Long adminUserId,
        String adminUsername,
        String adminEmail,
        String temporaryPassword
) {}
