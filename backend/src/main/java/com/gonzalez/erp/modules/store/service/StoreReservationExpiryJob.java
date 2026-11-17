package com.gonzalez.erp.modules.store.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Solo dispara el vencimiento; la lógica está en el servicio, que los tests llaman directo.
 * Con varias instancias del backend no hace falta bloqueo entre servidores: cada pedido se
 * bloquea y se vuelve a revisar antes de cancelarlo, así que dos tareas no lo cancelan dos veces.
 */
@Component
@RequiredArgsConstructor
public class StoreReservationExpiryJob {

    private final StoreReservationExpiryService expiryService;

    @Scheduled(cron = "${app.store.expiry-cron:0 */5 * * * *}", zone = "America/Argentina/Buenos_Aires")
    public void expireOverdueOrders() {
        expiryService.expireOverdueOrders();
    }
}
