package com.gonzalez.erp.modules.inventory.exception;

public class StockNotFoundException extends RuntimeException {

    public StockNotFoundException(Long id) {
        super("Stock not found with id: %s".formatted(id));
    }

    public StockNotFoundException(String productId, Long branchId) {
        super("Stock not found for product sku: %s and branch id: %s".formatted(productId, branchId));
    }
}