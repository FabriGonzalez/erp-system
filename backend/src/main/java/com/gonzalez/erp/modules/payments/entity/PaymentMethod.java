package com.gonzalez.erp.modules.payments.entity;

public enum PaymentMethod {
    CASH,
    TRANSFER,
    DEBIT_CARD,
    CREDIT_CARD,
    // Solo lo registra la tienda al acreditarse el pago: el ERP no lo acepta como medio elegido.
    MERCADO_PAGO
}
