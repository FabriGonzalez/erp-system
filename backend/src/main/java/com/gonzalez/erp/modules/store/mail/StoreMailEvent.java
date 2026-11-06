package com.gonzalez.erp.modules.store.mail;

/**
 * Pedido de mandar un mail de la tienda. Se publica dentro de la transacción y StoreMailSender lo
 * manda recién después del commit, en otro hilo: por eso lleva todo lo que el mail necesita y no
 * depende del request ni de entidades.
 */
public sealed interface StoreMailEvent {

    String to();

    String storeName();

    String storeDomain();

    /** Link para confirmar el email y terminar el registro. */
    record Verification(String to, String firstName, String storeName, String storeDomain, String token)
            implements StoreMailEvent {}

    /** Alguien se registró con un email que ya tiene cuenta: se le avisa al dueño. */
    record AlreadyRegistered(String to, String firstName, String storeName, String storeDomain)
            implements StoreMailEvent {}

    /** Link para elegir una contraseña nueva. */
    record PasswordReset(String to, String firstName, String storeName, String storeDomain, String token)
            implements StoreMailEvent {}

    /** Aviso de que la contraseña cambió: si no fue el dueño, se entera. */
    record PasswordChanged(String to, String firstName, String storeName, String storeDomain)
            implements StoreMailEvent {}
}
