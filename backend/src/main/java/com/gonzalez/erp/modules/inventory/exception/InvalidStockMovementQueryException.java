package com.gonzalez.erp.modules.inventory.exception;

/** Parámetros inválidos en el listado de movimientos (página o tamaño fuera de rango). */
public class InvalidStockMovementQueryException extends RuntimeException {

    public InvalidStockMovementQueryException(String message) {
        super(message);
    }
}
