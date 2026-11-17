package com.gonzalez.erp.modules.promotions.dto.response;

import com.gonzalez.erp.modules.promotions.entity.PromotionStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record PromotionResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        LocalDate startDate,
        LocalDate endDate,
        boolean active,
        PromotionStatus status,
        // Lo que costarían los productos sueltos hoy, con sus variantes más baratas y más caras:
        // el ahorro depende de las variantes que se elijan al vender.
        BigDecimal regularPriceMin,
        BigDecimal regularPriceMax,
        List<PromotionItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {}
