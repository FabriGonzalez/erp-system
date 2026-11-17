package com.gonzalez.erp.modules.promotions.exception;

/** Promo mal armada: fechas invertidas, variantes repetidas o inactivas. */
public class InvalidPromotionException extends RuntimeException {

    public InvalidPromotionException(String message) {
        super(message);
    }
}
