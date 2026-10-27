package com.gonzalez.erp.common.util;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class BusinessDateTest {

    @Test
    void afterNinePmInArgentinaItIsStillTheSameDay() {
        // 22:30 del 27 en Argentina = 01:30 del 28 en UTC.
        Clock clock = Clock.fixed(Instant.parse("2026-10-28T01:30:00Z"), ZoneOffset.UTC);

        assertThat(BusinessDate.today(clock)).isEqualTo(LocalDate.of(2026, 10, 27));
    }

    @Test
    void theDayChangesAtMidnightInArgentina() {
        // 00:10 del 28 en Argentina = 03:10 del 28 en UTC.
        Clock clock = Clock.fixed(Instant.parse("2026-10-28T03:10:00Z"), ZoneOffset.UTC);

        assertThat(BusinessDate.today(clock)).isEqualTo(LocalDate.of(2026, 10, 28));
    }
}
