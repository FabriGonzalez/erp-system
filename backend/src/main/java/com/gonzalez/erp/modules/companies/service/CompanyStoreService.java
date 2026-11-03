package com.gonzalez.erp.modules.companies.service;

import com.gonzalez.erp.modules.companies.dto.request.StoreSettingsRequest;
import com.gonzalez.erp.modules.companies.dto.response.StoreSettingsResponse;

public interface CompanyStoreService {

    StoreSettingsResponse getSettings();

    StoreSettingsResponse updateSettings(StoreSettingsRequest request);
}
