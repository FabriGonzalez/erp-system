package com.gonzalez.erp.modules.companies.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

// Dominio y habilitación no están: los carga el operador.
public record StoreSettingsRequest(
        @NotNull(message = "Price adjustment percent is required")
        @DecimalMin(value = "-90", message = "Price adjustment percent must be at least -90")
        @DecimalMax(value = "500", message = "Price adjustment percent must not exceed 500")
        @Digits(integer = 3, fraction = 2, message = "Price adjustment percent allows up to 2 decimals")
        BigDecimal priceAdjustmentPercent,

        @NotNull(message = "Rounding step is required")
        @Min(value = 1, message = "Rounding step must be at least 1")
        @Max(value = 1000, message = "Rounding step must not exceed 1000")
        Integer roundingStep
) {}
