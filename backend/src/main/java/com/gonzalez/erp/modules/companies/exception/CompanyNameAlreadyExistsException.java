package com.gonzalez.erp.modules.companies.exception;

public class CompanyNameAlreadyExistsException extends RuntimeException {
    public CompanyNameAlreadyExistsException(String name) {
        super("Company with name '%s' already exists".formatted(name));
    }
}
