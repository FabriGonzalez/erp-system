package com.gonzalez.erp.modules.orders.exception;

public class InactiveOrderVariantException extends RuntimeException {

    public InactiveOrderVariantException(Long variantId) {
        super("Product variant " + variantId + " (or its product) is inactive and cannot be sold");
    }
}
