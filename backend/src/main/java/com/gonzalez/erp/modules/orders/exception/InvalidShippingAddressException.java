package com.gonzalez.erp.modules.orders.exception;

public class InvalidShippingAddressException extends RuntimeException {

    public InvalidShippingAddressException(String message) {
        super(message);
    }
}
