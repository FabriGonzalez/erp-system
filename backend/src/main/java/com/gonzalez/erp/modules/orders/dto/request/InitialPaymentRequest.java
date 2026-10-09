package com.gonzalez.erp.modules.orders.dto.request;

import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record InitialPaymentRequest(
        @NotNull(message = "initialPayment.amount is required")
        @DecimalMin(value = "0.01", message = "initialPayment.amount must be greater than zero")
        BigDecimal amount,

        @NotNull(message = "initialPayment.method is required")
        PaymentMethod method
) {
}
