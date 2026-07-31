package com.gonzalez.erp.modules.products.exception;

public class ProductSkuAlreadyExistsException extends RuntimeException {

    public ProductSkuAlreadyExistsException(String sku) {
        super("Product with SKU '%s' already exists".formatted(sku));
    }
}
