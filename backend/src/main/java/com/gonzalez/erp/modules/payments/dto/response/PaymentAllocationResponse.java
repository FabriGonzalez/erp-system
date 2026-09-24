package com.gonzalez.erp.modules.payments.dto.response;

import java.math.BigDecimal;
import java.time.Instant;

public record PaymentAllocationResponse(
        Long id,
        Long orderId,
        String orderNumber,
        BigDecimal amount,
        Instant createdAt
) {}
