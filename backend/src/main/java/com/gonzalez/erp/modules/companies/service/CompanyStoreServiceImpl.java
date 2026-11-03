package com.gonzalez.erp.modules.companies.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.dto.request.StoreSettingsRequest;
import com.gonzalez.erp.modules.companies.dto.response.StoreSettingsResponse;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyStoreServiceImpl implements CompanyStoreService {

    private final CompanyRepository companyRepository;

    @Override
    public StoreSettingsResponse getSettings() {
        return toResponse(findCurrentCompany());
    }

    @Override
    @Transactional
    public StoreSettingsResponse updateSettings(StoreSettingsRequest request) {
        Company company = findCurrentCompany();
        company.updateStorePricing(request.priceAdjustmentPercent(), request.roundingStep());
        return toResponse(company);
    }

    private Company findCurrentCompany() {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        return companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found with id: " + companyId));
    }

    private static StoreSettingsResponse toResponse(Company company) {
        return new StoreSettingsResponse(
                company.getStoreDomain(),
                company.isStoreEnabled(),
                company.getStorePriceAdjustmentPercent(),
                company.getStoreRoundingStep()
        );
    }
}
