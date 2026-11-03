package com.gonzalez.erp.modules.companies.dto.response;

import java.math.BigDecimal;

public record StoreSettingsResponse(
        String storeDomain,
        boolean storeEnabled,
        BigDecimal priceAdjustmentPercent,
        int roundingStep
) {}
