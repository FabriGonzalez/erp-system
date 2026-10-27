package com.gonzalez.erp.common.util;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * La fecha del negocio, la de Argentina. La JVM corre en UTC (BackendApplication), así que
 * LocalDate.now() ya da el día siguiente desde las 21 hs: una promo que vence hoy figuraría
 * vencida antes de cerrar el local.
 */
public final class BusinessDate {

    public static final ZoneId ZONE = ZoneId.of("America/Argentina/Buenos_Aires");

    private BusinessDate() {}

    public static LocalDate today() {
        return today(Clock.systemUTC());
    }

    static LocalDate today(Clock clock) {
        return LocalDate.now(clock.withZone(ZONE));
    }
}
