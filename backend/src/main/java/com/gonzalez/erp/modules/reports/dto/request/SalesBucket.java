package com.gonzalez.erp.modules.reports.dto.request;

import java.time.Duration;

/**
 * Largo de cada tramo de la serie de ventas. Los tramos se cuentan desde from: si from es la
 * medianoche local, caen en las horas y los días locales sin pasar la zona horaria.
 */
public enum SalesBucket {
    HOUR(Duration.ofHours(1)),
    DAY(Duration.ofDays(1));

    private final Duration length;

    SalesBucket(Duration length) {
        this.length = length;
    }

    public Duration length() {
        return length;
    }
}
