package com.gonzalez.erp.modules.inventory.exception;

public class InsufficientStockException extends RuntimeException {

    public InsufficientStockException(Long stockId, Integer currentQuantity, Integer requestedQuantity) {
        super("Insufficient stock for stock id: %s. Current quantity: %d, requested: %d".formatted(
                stockId, currentQuantity, requestedQuantity));
    }
}