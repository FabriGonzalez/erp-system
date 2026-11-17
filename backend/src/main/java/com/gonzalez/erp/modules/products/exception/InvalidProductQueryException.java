package com.gonzalez.erp.modules.products.exception;

/** Parámetros inválidos en el listado de productos (página, tamaño u orden). */
public class InvalidProductQueryException extends RuntimeException {

    public InvalidProductQueryException(String message) {
        super(message);
    }
}
