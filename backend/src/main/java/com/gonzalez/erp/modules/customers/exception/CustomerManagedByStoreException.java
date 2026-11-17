package com.gonzalez.erp.modules.customers.exception;

/** El ERP intentó cambiar un dato que en una ficha web administra el comprador desde la tienda. */
public class CustomerManagedByStoreException extends RuntimeException {
    public CustomerManagedByStoreException() {
        super("This data is managed by the customer from the online store");
    }
}
