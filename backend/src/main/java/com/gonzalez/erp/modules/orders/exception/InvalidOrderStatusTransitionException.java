package com.gonzalez.erp.modules.orders.exception;

public class InvalidOrderStatusTransitionException extends RuntimeException {

    public InvalidOrderStatusTransitionException(String message) {
        super(message);
    }
}