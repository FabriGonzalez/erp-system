package com.gonzalez.erp.modules.inventory.exception;

/** Parámetros inválidos en el listado de stock (página o tamaño fuera de rango). */
public class InvalidStockQueryException extends RuntimeException {

    public InvalidStockQueryException(String message) {
        super(message);
    }
}
