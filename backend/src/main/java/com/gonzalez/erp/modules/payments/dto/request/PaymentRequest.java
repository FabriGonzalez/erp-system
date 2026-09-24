package com.gonzalez.erp.modules.payments.dto.request;

import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PaymentRequest(
        @NotNull(message = "Customer ID is required")
        Long customerId,

        @NotNull(message = "Branch ID is required")
        Long branchId,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        BigDecimal amount,

        @NotNull(message = "Payment method is required")
        PaymentMethod method
) {}
