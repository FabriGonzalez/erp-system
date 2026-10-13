package com.gonzalez.erp.modules.customers.exception;

/** Parámetros de consulta inválidos (paginación u orden). */
public class InvalidCustomerRequestException extends RuntimeException {
    public InvalidCustomerRequestException(String message) {
        super(message);
    }
}
