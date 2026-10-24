package com.gonzalez.erp.modules.promotions.exception;

/** Se quiso vender una promo que no está vigente o que tiene alguna variante inactiva. */
public class PromotionNotAvailableException extends RuntimeException {

    public PromotionNotAvailableException(String message) {
        super(message);
    }
}
