package com.gonzalez.erp.modules.store.mail;

import java.math.BigDecimal;
import java.util.List;

/**
 * Pedido de mandar un mail de la tienda. Se publica dentro de la transacción y StoreMailSender lo
 * manda recién después del commit, en otro hilo: por eso lleva todo lo que el mail necesita y no
 * depende del request ni de entidades.
 */
public sealed interface StoreMailEvent {

    String to();

    String storeName();

    String storeDomain();

    /** Remitente propio de la tienda; null = MAIL_FROM. */
    String storeMailFrom();

    /** Link para confirmar el email y terminar el registro. */
    record Verification(String to, String firstName, String storeName, String storeDomain, String storeMailFrom, String token)
            implements StoreMailEvent {}

    /** Alguien se registró con un email que ya tiene cuenta: se le avisa al dueño. Sin contraseña, entra con Google. */
    record AlreadyRegistered(String to, String firstName, String storeName, String storeDomain, String storeMailFrom,
                             boolean hasPassword)
            implements StoreMailEvent {}

    /** Link para elegir una contraseña nueva. */
    record PasswordReset(String to, String firstName, String storeName, String storeDomain, String storeMailFrom, String token)
            implements StoreMailEvent {}

    /** Aviso de que la contraseña cambió: si no fue el dueño, se entera. */
    record PasswordChanged(String to, String firstName, String storeName, String storeDomain, String storeMailFrom)
            implements StoreMailEvent {}

    /** Se acreditó el pago: qué compró, cuánto pagó y cómo lo recibe. */
    record OrderConfirmed(String to, String firstName, String storeName, String storeDomain, String storeMailFrom,
                          Long orderId, String orderNumber, List<Line> lines, BigDecimal total, Delivery delivery)
            implements StoreMailEvent {}

    /** La reserva venció sin pago y el pedido se canceló. */
    record OrderExpired(String to, String firstName, String storeName, String storeDomain, String storeMailFrom,
                        Long orderId, String orderNumber)
            implements StoreMailEvent {}

    /** Una línea del pedido; una promo lleva sus productos en {@code components}. */
    record Line(String name, int quantity, List<Line> components) {}

    /**
     * {@code place}: en retiro, la sucursal (con su dirección si la tiene); en envío, la dirección de destino.
     * {@code multipleBranches}: sale de varias sucursales y puede demorar más.
     */
    record Delivery(boolean pickup, String place, boolean multipleBranches) {}
}
