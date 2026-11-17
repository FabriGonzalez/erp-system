package com.gonzalez.erp.config.security;

import com.gonzalez.erp.modules.auth.exception.TooManyLoginAttemptsException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LoginAttemptServiceTest {

    private static final String IP = "10.0.0.1";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-13T12:00:00Z"));
    private final LoginAttemptService service = new LoginAttemptService(
            3, 10, Duration.ofMinutes(15), Duration.ofMinutes(15), clock);

    @Test
    void blocksUserAfterMaxFailuresEvenWithCorrectPasswordNext() {
        fail("admin", 3);

        assertThatThrownBy(() -> service.checkAllowed("admin", IP))
                .isInstanceOfSatisfying(TooManyLoginAttemptsException.class,
                        e -> assertThat(e.getRetryAfterSeconds()).isEqualTo(900));
    }

    @Test
    void usernameCasingDoesNotBypassTheLimit() {
        service.recordFailure("admin", IP);
        service.recordFailure("ADMIN", IP);
        service.recordFailure(" Admin ", IP);

        assertThatThrownBy(() -> service.checkAllowed("admin", "10.0.0.2"))
                .isInstanceOf(TooManyLoginAttemptsException.class);
    }

    @Test
    void lockoutExpires() {
        fail("admin", 3);
        clock.advance(Duration.ofMinutes(15));

        assertThatCode(() -> service.checkAllowed("admin", IP)).doesNotThrowAnyException();
    }

    @Test
    void failuresOutsideTheWindowDoNotAccumulate() {
        fail("admin", 2);
        clock.advance(Duration.ofMinutes(16));
        fail("admin", 2);

        assertThatCode(() -> service.checkAllowed("admin", IP)).doesNotThrowAnyException();
    }

    @Test
    void successResetsUserCounterButNotIpCounter() {
        // 5 rondas de 2 fallos + 1 acierto: el usuario nunca llega a 3, la IP sí llega a 10.
        for (int i = 0; i < 5; i++) {
            fail("admin", 2);
            service.recordSuccess("admin");
        }

        assertThatCode(() -> service.checkAllowed("admin", "10.0.0.2")).doesNotThrowAnyException();
        assertThatThrownBy(() -> service.checkAllowed("admin", IP))
                .isInstanceOf(TooManyLoginAttemptsException.class);
    }

    @Test
    void blocksIpThatSpraysManyUsernames() {
        for (int i = 0; i < 10; i++) {
            service.recordFailure("user" + i, IP);
        }

        assertThatThrownBy(() -> service.checkAllowed("otro", IP))
                .isInstanceOf(TooManyLoginAttemptsException.class);
        assertThatCode(() -> service.checkAllowed("otro", "10.0.0.2")).doesNotThrowAnyException();
    }

    private void fail(String username, int times) {
        for (int i = 0; i < times; i++) {
            service.recordFailure(username, IP);
        }
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
