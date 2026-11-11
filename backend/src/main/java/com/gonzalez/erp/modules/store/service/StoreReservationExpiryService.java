package com.gonzalez.erp.modules.store.service;

public interface StoreReservationExpiryService {

    /**
     * Cancela los pedidos de la tienda sin pagar cuya reserva venció hace más que el margen,
     * devuelve el stock y le avisa al comprador. Devuelve cuántos canceló.
     */
    int expireOverdueOrders();
}
