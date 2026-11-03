package com.gonzalez.erp.modules.products.exception;

/** Para publicar en la tienda, el producto necesita al menos una foto, propia o de una variante. */
public class ProductImageRequiredException extends RuntimeException {

    public ProductImageRequiredException(Long productId) {
        super("Product " + productId + " needs at least one image to be published");
    }
}
