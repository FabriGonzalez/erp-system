package com.gonzalez.erp.modules.customers.dto.response;

import java.math.BigDecimal;

/** Deuda de todos los clientes de la empresa: la misma que suma el listado de deudores. */
public record CustomerDebtSummaryResponse(
        BigDecimal totalDebt,
        long debtorCount
) {
}
