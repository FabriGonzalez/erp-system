package com.gonzalez.erp.modules.products.exception;

import lombok.Getter;

/** Foto rechazada: el código le dice al panel de la tienda qué explicar. */
@Getter
public class InvalidProductImageException extends RuntimeException {

    private final String code;

    private InvalidProductImageException(String code, String message) {
        super(message);
        this.code = code;
    }

    public static InvalidProductImageException invalidType() {
        return new InvalidProductImageException("IMAGE_INVALID_TYPE", "Only JPG, PNG and WebP images are allowed");
    }

    public static InvalidProductImageException tooLarge(long maxBytes) {
        return new InvalidProductImageException("IMAGE_TOO_LARGE", "Images must not exceed " + maxBytes + " bytes");
    }

    public static InvalidProductImageException limitReached(int max) {
        return new InvalidProductImageException("IMAGE_LIMIT_REACHED",
                "A product or variant can have at most " + max + " images");
    }

    public static InvalidProductImageException notUploaded() {
        return new InvalidProductImageException("IMAGE_NOT_UPLOADED", "The image was not uploaded or the key is invalid");
    }

    public static InvalidProductImageException invalidOrder() {
        return new InvalidProductImageException("IMAGE_INVALID_ORDER",
                "The order must list exactly the current images of the product or variant");
    }
}
