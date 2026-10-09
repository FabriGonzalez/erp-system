package com.gonzalez.erp.modules.payments.service;

import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;

import java.math.BigDecimal;

/**
 * Operaciones de pago ligadas a una orden concreta (no al reparto FIFO de
 * POST /payments). Deben ejecutarse dentro de la transacción de la orden.
 */
public interface OrderPaymentService {

    /** Aplica el saldo a favor del cliente a la orden. Retorna el importe aplicado. */
    BigDecimal applyCredit(Order order, Long companyId);

    /** Registra un pago del cliente y lo asigna íntegro a la orden. */
    void registerOrderPayment(Order order, BigDecimal amount, PaymentMethod method, Long userId, Long companyId);

    /** Si el total de la orden bajó por debajo de lo asignado, libera el excedente como saldo a favor. */
    void trimAllocationsToTotal(Order order);
}
