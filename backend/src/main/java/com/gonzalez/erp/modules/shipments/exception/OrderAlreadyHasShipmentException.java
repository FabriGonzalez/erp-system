package com.gonzalez.erp.modules.shipments.exception;

public class OrderAlreadyHasShipmentException extends RuntimeException {

    public OrderAlreadyHasShipmentException(String message) {
        super(message);
    }
}
