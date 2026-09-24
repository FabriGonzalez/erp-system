package com.gonzalez.erp.modules.payments.dto.response;

import com.gonzalez.erp.modules.payments.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PaymentResponse(
        Long id,
        Long companyId,
        Long branchId,
        String branchName,
        Long customerId,
        String customerName,
        BigDecimal amount,
        PaymentMethod method,
        Instant createdAt,
        List<PaymentAllocationResponse> allocations
) {}
