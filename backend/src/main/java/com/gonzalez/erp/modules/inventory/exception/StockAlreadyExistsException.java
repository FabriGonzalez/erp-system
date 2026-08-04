package com.gonzalez.erp.modules.inventory.exception;

public class StockAlreadyExistsException extends RuntimeException {

    public StockAlreadyExistsException(Long productId, Long branchId) {
        super("Stock already exists for product id: %s and branch id: %s".formatted(productId, branchId));
    }
}