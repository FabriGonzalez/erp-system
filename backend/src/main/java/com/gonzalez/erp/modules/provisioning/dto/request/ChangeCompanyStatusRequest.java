package com.gonzalez.erp.modules.provisioning.dto.request;

import com.gonzalez.erp.modules.companies.entity.CompanyStatus;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChangeCompanyStatusRequest(
        @NotNull(message = "Status is required")
        CompanyStatus status,

        @Size(max = 500, message = "Reason must not exceed 500 characters")
        String reason
) {
    @AssertTrue(message = "Reason is required to suspend or cancel a company")
    public boolean isReasonPresentWhenRequired() {
        return status == null
                || status == CompanyStatus.ACTIVE
                || (reason != null && !reason.isBlank());
    }
}
