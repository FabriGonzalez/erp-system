package com.gonzalez.erp.modules.inventory.exception;

public class StockNotFoundException extends RuntimeException {

    public StockNotFoundException(Long id) {
        super("Stock not found with id: ".formatted(id));
    }

    public StockNotFoundException(Long productId, Long branchId) {
        super("Stock not found for product id: %s and branch id: %s".formatted(productId, branchId));
    }
}