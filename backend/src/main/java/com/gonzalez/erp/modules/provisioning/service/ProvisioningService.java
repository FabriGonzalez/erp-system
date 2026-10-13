package com.gonzalez.erp.modules.provisioning.service;

import com.gonzalez.erp.modules.provisioning.dto.request.ChangeCompanyStatusRequest;
import com.gonzalez.erp.modules.provisioning.dto.request.ProvisionCompanyRequest;
import com.gonzalez.erp.modules.provisioning.dto.response.CompanyStatusResponse;
import com.gonzalez.erp.modules.provisioning.dto.response.ProvisionCompanyResponse;

public interface ProvisioningService {
    ProvisionCompanyResponse provisionCompany(ProvisionCompanyRequest request);

    CompanyStatusResponse changeCompanyStatus(Long companyId, ChangeCompanyStatusRequest request);
}
