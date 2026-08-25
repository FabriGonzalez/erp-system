package com.gonzalez.erp.modules.inventory.exception;

public class StockAlreadyExistsException extends RuntimeException {

    public StockAlreadyExistsException(String productId, Long branchId) {
        super("Stock already exists for product sku: %s and branch id: %s".formatted(productId, branchId));
    }
}