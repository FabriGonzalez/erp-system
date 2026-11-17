package com.gonzalez.erp.config.security;

import java.security.SecureRandom;
import java.util.Base64;

/** Contraseñas aleatorias que se muestran una sola vez (alta de empresa, reset por admin). */
public final class TemporaryPasswords {

    private static final SecureRandom RANDOM = new SecureRandom();

    private TemporaryPasswords() {}

    public static String generate() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
