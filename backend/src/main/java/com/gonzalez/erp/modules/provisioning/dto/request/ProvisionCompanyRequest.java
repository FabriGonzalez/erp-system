package com.gonzalez.erp.modules.provisioning.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProvisionCompanyRequest(
        @NotBlank(message = "Company name is required")
        @Size(max = 100) String companyName,

        @Size(max = 150) String legalName,

        @Size(max = 20) String taxId,

        @NotBlank(message = "Admin username is required")
        @Size(max = 50) String adminUsername,

        @NotBlank(message = "Admin email is required")
        @Email(message = "Admin email must be valid")
        @Size(max = 100) String adminEmail,

        @Size(max = 100) String adminFirstName,

        @Size(max = 100) String adminLastName
) {}
