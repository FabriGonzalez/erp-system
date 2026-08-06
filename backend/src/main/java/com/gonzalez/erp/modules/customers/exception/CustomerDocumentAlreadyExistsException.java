package com.gonzalez.erp.modules.customers.exception;

public class CustomerDocumentAlreadyExistsException extends RuntimeException {
    public CustomerDocumentAlreadyExistsException(String documentType, String documentNumber) {
        super("Customer with document %s %s already exists".formatted(documentType, documentNumber));
    }
}
