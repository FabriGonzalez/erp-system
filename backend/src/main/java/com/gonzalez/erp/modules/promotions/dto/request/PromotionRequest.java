package com.gonzalez.erp.modules.promotions.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Alta y edición (la edición reemplaza todo). Las fechas son inclusive. */
public record PromotionRequest(
        @NotBlank(message = "name is required")
        @Size(max = 100, message = "name must not exceed 100 characters")
        String name,

        @Size(max = 500, message = "description must not exceed 500 characters")
        String description,

        @NotNull(message = "price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "price must be greater than 0")
        BigDecimal price,

        @NotNull(message = "startDate is required")
        LocalDate startDate,

        @NotNull(message = "endDate is required")
        LocalDate endDate,

        // Productos sin repetir, cada uno con su cantidad.
        @NotEmpty(message = "A promotion needs at least one item")
        List<@Valid @NotNull PromotionItemRequest> items
) {}
