package com.gonzalez.erp.modules.customers.dto.response;

import com.gonzalez.erp.modules.customers.entity.TransactionType;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Movimiento de la cuenta corriente. amount positivo aumenta lo que el cliente debe
 * (cargos, anulación de pagos, devoluciones); negativo lo reduce (pagos, reversiones).
 */
public record AccountTransactionResponse(
        Long id,
        TransactionType type,
        BigDecimal amount,
        String description,
        Long branchId,
        String branchName,
        Instant createdAt
) {}
