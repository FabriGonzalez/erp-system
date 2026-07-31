package com.gonzalez.erp.modules.products.exception;

public class ProductCategoryNotActiveException extends RuntimeException {

    public ProductCategoryNotActiveException(String categoryName) {
        super("Category '%s' is deactivated and cannot be assigned to products".formatted(categoryName));
    }
}
