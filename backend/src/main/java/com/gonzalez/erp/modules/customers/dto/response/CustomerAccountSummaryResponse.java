package com.gonzalez.erp.modules.customers.dto.response;

import java.math.BigDecimal;

/**
 * Estado de cuenta del cliente.
 * balance: saldo contable (positivo = debe, negativo = a favor).
 * debt: suma de lo pendiente de pago en sus órdenes no canceladas.
 * credit: dinero disponible para aplicar a nuevas órdenes.
 */
public record CustomerAccountSummaryResponse(
        Long customerId,
        BigDecimal balance,
        BigDecimal debt,
        BigDecimal credit,
        int pendingOrders
) {
}
