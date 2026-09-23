package com.gonzalez.erp.modules.products.exception;

public class ProductAttributeNameAlreadyExistsException extends RuntimeException {

    public ProductAttributeNameAlreadyExistsException(String name) {
        super("An attribute with name '%s' already exists for this company".formatted(name));
    }
}
