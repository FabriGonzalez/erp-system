package com.gonzalez.erp.modules.mercadopago.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * El {@code external_reference} de los cobros de la tienda: {@code erp-order-<id del pedido>}. La
 * cuenta de Mercado Pago es del local y puede cobrar otras ventas (otro sistema, otra integración)
 * con referencias propias; un número pelado podría coincidir con uno de nuestros pedidos y el
 * webhook acreditaría o devolvería una venta ajena. Solo se reconocen las que tienen este formato.
 */
public final class MercadoPagoOrderReference {

    private static final String PREFIX = "erp-order-";
    private static final Pattern FORMAT = Pattern.compile("^erp-order-([1-9][0-9]{0,18})$");

    private MercadoPagoOrderReference() {
    }

    public static String of(Long orderId) {
        return PREFIX + orderId;
    }

    /** El id del pedido, o vacío si la referencia no la generamos nosotros. */
    public static Optional<Long> parse(String externalReference) {
        if (externalReference == null) {
            return Optional.empty();
        }
        Matcher matcher = FORMAT.matcher(externalReference);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(matcher.group(1)));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
}
