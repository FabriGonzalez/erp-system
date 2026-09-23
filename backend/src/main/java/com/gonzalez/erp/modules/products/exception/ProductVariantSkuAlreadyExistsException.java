package com.gonzalez.erp.modules.products.exception;

public class ProductVariantSkuAlreadyExistsException extends RuntimeException {

    public ProductVariantSkuAlreadyExistsException(String sku) {
        super("A variant with SKU '%s' already exists for this company".formatted(sku));
    }
}
