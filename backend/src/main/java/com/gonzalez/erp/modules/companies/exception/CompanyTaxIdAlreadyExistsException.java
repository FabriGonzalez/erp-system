package com.gonzalez.erp.modules.companies.exception;

public class CompanyTaxIdAlreadyExistsException extends RuntimeException {

    public CompanyTaxIdAlreadyExistsException(String taxId) {
        super("Company already exists with tax ID: " + taxId);
    }
}