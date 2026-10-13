package com.gonzalez.erp.modules.orders.exception;

public class InactiveOrderCustomerException extends RuntimeException {

    public InactiveOrderCustomerException(Long customerId) {
        super("Customer " + customerId + " is inactive and cannot receive new orders");
    }
}
