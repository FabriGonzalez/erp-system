package com.gonzalez.erp.modules.provisioning.service;

import com.gonzalez.erp.modules.provisioning.dto.request.ChangeCompanyStatusRequest;
import com.gonzalez.erp.modules.provisioning.dto.request.ProvisionCompanyRequest;
import com.gonzalez.erp.modules.provisioning.dto.response.CompanyResponse;
import com.gonzalez.erp.modules.provisioning.dto.response.ProvisionCompanyResponse;

import java.util.List;

public interface ProvisioningService {
    List<CompanyResponse> findAllCompanies();

    ProvisionCompanyResponse provisionCompany(ProvisionCompanyRequest request);

    CompanyResponse changeCompanyStatus(Long companyId, ChangeCompanyStatusRequest request);
}
