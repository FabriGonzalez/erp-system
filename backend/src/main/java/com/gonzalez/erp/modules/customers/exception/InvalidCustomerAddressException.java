package com.gonzalez.erp.modules.customers.exception;

public class InvalidCustomerAddressException extends RuntimeException {
    public InvalidCustomerAddressException(String message) {
        super(message);
    }
}
