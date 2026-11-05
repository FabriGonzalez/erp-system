package com.gonzalez.erp.modules.store.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Tokens de los links que van por mail. El token viaja solo en el mail; en la base se guarda su
 * SHA-256, así una base filtrada no sirve para usar los links. Alcanza un hash rápido (no BCrypt)
 * porque el token es aleatorio de 256 bits: no se puede adivinar probando.
 */
public final class StoreLinkTokens {

    private static final SecureRandom RANDOM = new SecureRandom();

    public record IssuedToken(String token, String hash) {}

    private StoreLinkTokens() {}

    public static IssuedToken issue() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return new IssuedToken(token, hash(token));
    }

    public static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
