package com.gonzalez.erp.modules.products.exception;

public class ProductVariantBarcodeAlreadyExistsException extends RuntimeException {

    public ProductVariantBarcodeAlreadyExistsException(String barcode) {
        super("A variant with barcode '%s' already exists for this company".formatted(barcode));
    }
}
