package com.gonzalez.erp.modules.customers.exception;

public class InvalidCustomerDocumentException extends RuntimeException {
    public InvalidCustomerDocumentException() {
        super("documentType and documentNumber must be provided together");
    }
}
