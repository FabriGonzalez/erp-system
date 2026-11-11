package com.gonzalez.erp.modules.mercadopago.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Solo dispara la renovación; la lógica está en el servicio, que los tests llaman directo.
 * Sin bloqueo entre servidores: hoy corre una sola instancia del backend. Con varias, hay que
 * agregar uno (p. ej. ShedLock) para que no renueven dos a la vez y se pisen el refresh token.
 */
@Component
@RequiredArgsConstructor
public class MercadoPagoTokenRenewalJob {

    private final MercadoPagoTokenRenewalService renewalService;

    @Scheduled(cron = "${app.mercadopago.renewal-cron:0 0 4 * * *}", zone = "America/Argentina/Buenos_Aires")
    public void renewExpiringTokens() {
        renewalService.renewExpiringTokens();
    }
}
