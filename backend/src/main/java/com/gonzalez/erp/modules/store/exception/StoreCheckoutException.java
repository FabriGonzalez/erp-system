package com.gonzalez.erp.modules.store.exception;

import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Compras que no se pueden hacer, con su código para que el sitio sepa qué mostrar. Cuando el
 * problema es el carrito, viaja la cotización actual y el sitio no necesita volver a pedirla.
 */
@Getter
public class StoreCheckoutException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final StoreCartQuoteResponse quote;

    private StoreCheckoutException(HttpStatus status, String code, String message, StoreCartQuoteResponse quote) {
        super(message);
        this.status = status;
        this.code = code;
        this.quote = quote;
    }

    /** Alguna línea ya no se puede comprar (sin stock, despublicada, promo vencida) o el carrito está vacío. */
    public static StoreCheckoutException cartUnavailable(StoreCartQuoteResponse quote) {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "CART_UNAVAILABLE",
                "Some items of the cart can no longer be bought", quote);
    }

    /** El comprador vio otro total: cambió un precio desde que cotizó. */
    public static StoreCheckoutException cartChanged(StoreCartQuoteResponse quote) {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "CART_CHANGED",
                "The cart total changed since it was quoted", quote);
    }

    public static StoreCheckoutException pickupNotAvailable(StoreCartQuoteResponse quote) {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "PICKUP_NOT_AVAILABLE",
                "The chosen branch cannot prepare the whole order", quote);
    }

    public static StoreCheckoutException profileIncomplete() {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "PROFILE_INCOMPLETE",
                "First name and phone are required to buy", null);
    }

    public static StoreCheckoutException addressIncomplete() {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "ADDRESS_INCOMPLETE",
                "Street, number, city, state and postal code are required to ship", null);
    }

    public static StoreCheckoutException tooManyPendingOrders() {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "TOO_MANY_PENDING_ORDERS",
                "There are too many orders waiting for payment", null);
    }

    /** La clave ya se usó para un pedido de otro comprador. */
    public static StoreCheckoutException checkoutKeyInUse() {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "CHECKOUT_KEY_IN_USE",
                "The checkout key was already used", null);
    }

    /** Ya se pagó o ya estaba cancelado: desde la tienda solo se cancela lo que espera el pago. */
    public static StoreCheckoutException orderNotCancellable() {
        return new StoreCheckoutException(HttpStatus.CONFLICT, "ORDER_NOT_CANCELLABLE",
                "Only orders waiting for payment can be cancelled", null);
    }

    public static StoreCheckoutException invalidDelivery(String message) {
        return new StoreCheckoutException(HttpStatus.BAD_REQUEST, "INVALID_DELIVERY", message, null);
    }
}
