package com.gonzalez.erp.modules.orders.exception;

public class InvalidOrderException extends RuntimeException {

    public InvalidOrderException(String message) {
        super(message);
    }
}
