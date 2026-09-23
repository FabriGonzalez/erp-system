package com.gonzalez.erp.modules.products.exception;

public class ProductAttributeValueAlreadyExistsException extends RuntimeException {

    public ProductAttributeValueAlreadyExistsException(String value, String attributeName) {
        super("Value '%s' already exists for attribute '%s'".formatted(value, attributeName));
    }
}
