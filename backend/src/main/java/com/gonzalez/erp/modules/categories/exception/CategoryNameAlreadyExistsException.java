package com.gonzalez.erp.modules.categories.exception;

public class CategoryNameAlreadyExistsException extends RuntimeException {

    public CategoryNameAlreadyExistsException(String name) {
        super("Category with name '%s' already exists".formatted(name));
    }
}
