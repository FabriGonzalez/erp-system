package com.gonzalez.erp.modules.products.exception;

public class AttributeNotInCategoryException extends RuntimeException {

    public AttributeNotInCategoryException(String attributeName, String categoryName) {
        super("Attribute '%s' is not enabled for category '%s'".formatted(attributeName, categoryName));
    }
}
