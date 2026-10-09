package com.gonzalez.erp.modules.customers.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record CustomerDebtorResponse(
        Long customerId,
        String customerName,
        BigDecimal debt,
        BigDecimal credit,
        int pendingOrders,
        Instant oldestPendingOrderAt
) {
}
