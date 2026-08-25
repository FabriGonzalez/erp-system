package com.gonzalez.erp.modules.provisioning.service;

import com.gonzalez.erp.modules.provisioning.dto.request.ProvisionCompanyRequest;
import com.gonzalez.erp.modules.provisioning.dto.response.ProvisionCompanyResponse;

public interface ProvisioningService {
    ProvisionCompanyResponse provisionCompany(ProvisionCompanyRequest request);
}
