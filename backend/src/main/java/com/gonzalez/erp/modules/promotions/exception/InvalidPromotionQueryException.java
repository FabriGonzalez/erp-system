package com.gonzalez.erp.modules.promotions.exception;

/** Parámetros inválidos en el listado de promos (página, tamaño u orden). */
public class InvalidPromotionQueryException extends RuntimeException {

    public InvalidPromotionQueryException(String message) {
        super(message);
    }
}
