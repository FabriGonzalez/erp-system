package com.gonzalez.erp.modules.orders.exception;

public class InsufficientStockForEditException extends RuntimeException {

    public InsufficientStockForEditException(String message) {
        super(message);
    }
}