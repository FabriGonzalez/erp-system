package com.gonzalez.erp.modules.payments.dto.response;

import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.payments.entity.PaymentStatus;

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
        PaymentStatus status,
        Long createdById,
        String createdByUsername,
        Instant createdAt,
        Instant cancelledAt,
        Long cancelledById,
        String cancelledByUsername,
        List<PaymentAllocationResponse> allocations
) {}
