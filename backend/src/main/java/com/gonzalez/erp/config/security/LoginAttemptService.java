package com.gonzalez.erp.config.security;

import com.gonzalez.erp.modules.auth.exception.TooManyLoginAttemptsException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita los intentos fallidos de contraseña por usuario y por IP.
 *
 * El estado vive en memoria: alcanza para una sola instancia del backend. Con varias
 * instancias habría que moverlo a un almacenamiento compartido (p. ej. Redis).
 */
@Component
public class LoginAttemptService {

    private static final int CLEANUP_THRESHOLD = 10_000;

    private record Attempts(int failures, Instant windowStart, Instant blockedUntil) {}

    private final ConcurrentHashMap<String, Attempts> attempts = new ConcurrentHashMap<>();
    private final int maxFailuresPerUser;
    private final int maxFailuresPerIp;
    private final Duration window;
    private final Duration lockout;
    private final Clock clock;

    @Autowired
    public LoginAttemptService(
            @Value("${app.security.login.max-failures-per-user:5}") int maxFailuresPerUser,
            @Value("${app.security.login.max-failures-per-ip:30}") int maxFailuresPerIp,
            @Value("${app.security.login.window:15m}") Duration window,
            @Value("${app.security.login.lockout:15m}") Duration lockout) {
        this(maxFailuresPerUser, maxFailuresPerIp, window, lockout, Clock.systemUTC());
    }

    LoginAttemptService(int maxFailuresPerUser, int maxFailuresPerIp,
                        Duration window, Duration lockout, Clock clock) {
        this.maxFailuresPerUser = maxFailuresPerUser;
        this.maxFailuresPerIp = maxFailuresPerIp;
        this.window = window;
        this.lockout = lockout;
        this.clock = clock;
    }

    /** Se llama antes de verificar la contraseña: un bloqueo rige aunque la contraseña sea correcta. */
    public void checkAllowed(String username, String ip) {
        Instant now = clock.instant();
        checkKey(userKey(username), now);
        checkKey(ipKey(ip), now);
    }

    public void recordFailure(String username, String ip) {
        Instant now = clock.instant();
        recordFailure(userKey(username), maxFailuresPerUser, now);
        recordFailure(ipKey(ip), maxFailuresPerIp, now);
        if (attempts.size() > CLEANUP_THRESHOLD) {
            attempts.entrySet().removeIf(entry -> isExpired(entry.getValue(), now));
        }
    }

    /**
     * Limpia el contador del usuario. El de la IP se mantiene: un acierto no debe
     * habilitar más intentos contra otras cuentas desde el mismo origen.
     */
    public void recordSuccess(String username) {
        attempts.remove(userKey(username));
    }

    private void checkKey(String key, Instant now) {
        Attempts current = attempts.get(key);
        if (current == null || current.blockedUntil() == null) {
            return;
        }
        if (now.isBefore(current.blockedUntil())) {
            long retryAfter = Math.max(1, Duration.between(now, current.blockedUntil()).toSeconds());
            throw new TooManyLoginAttemptsException(retryAfter);
        }
        attempts.remove(key, current);
    }

    private void recordFailure(String key, int maxFailures, Instant now) {
        attempts.compute(key, (k, current) -> {
            if (current == null || isExpired(current, now)) {
                current = new Attempts(0, now, null);
            }
            int failures = current.failures() + 1;
            Instant blockedUntil = failures >= maxFailures ? now.plus(lockout) : current.blockedUntil();
            return new Attempts(failures, current.windowStart(), blockedUntil);
        });
    }

    private boolean isExpired(Attempts attempts, Instant now) {
        if (attempts.blockedUntil() != null) {
            return !now.isBefore(attempts.blockedUntil());
        }
        return !now.isBefore(attempts.windowStart().plus(window));
    }

    private static String userKey(String username) {
        // Sin distinguir mayúsculas, para que variar el casing no habilite más intentos.
        return "user:" + (username == null ? "" : username.trim().toLowerCase(Locale.ROOT));
    }

    private static String ipKey(String ip) {
        return "ip:" + (ip == null ? "unknown" : ip);
    }
}
