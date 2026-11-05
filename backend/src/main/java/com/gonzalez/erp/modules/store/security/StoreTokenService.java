package com.gonzalez.erp.modules.store.security;

import com.gonzalez.erp.modules.store.entity.StoreAccount;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Date;

/**
 * Token del comprador de la tienda. Se firma con una clave propia, derivada de app.jwt.secret:
 * el JwtAuthFilter del ERP no acepta este token y este servicio no acepta el del ERP, sin sumar
 * una variable de entorno. Además lleva el tipo y la empresa de la tienda donde se emitió.
 */
@Component
public class StoreTokenService {

    static final String TYPE = "store_customer";
    // Cambiar este texto invalida todos los tokens de comprador emitidos.
    private static final String KEY_CONTEXT = "erp-store-customer-token-v1";

    private final SecretKey secretKey;
    private final long expirationMs;

    public StoreTokenService(
            @Value("${app.jwt.secret}") String erpSecret,
            @Value("${app.store.jwt.expiration-ms:604800000}") long expirationMs) {
        this.secretKey = deriveKey(erpSecret);
        this.expirationMs = expirationMs;
    }

    /** Lo que el filtro necesita del token; null si no es válido. */
    public record StoreTokenClaims(Long accountId, Long companyId, Instant issuedAt) {}

    public String generate(StoreAccount account) {
        Date now = new Date();
        return Jwts.builder()
                .subject(account.getId().toString())
                .claim("type", TYPE)
                .claim("companyId", account.getCompany().getId())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(secretKey)
                .compact();
    }

    /** Null si la firma no es de esta clave, venció, está mal formado o no es de comprador. */
    public StoreTokenClaims validate(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
            Long companyId = claims.get("companyId", Long.class);
            if (!TYPE.equals(claims.get("type", String.class)) || companyId == null
                    || claims.getSubject() == null || claims.getIssuedAt() == null) {
                return null;
            }
            return new StoreTokenClaims(Long.valueOf(claims.getSubject()), companyId, claims.getIssuedAt().toInstant());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    /*
     * HMAC-SHA256 de la clave del ERP con un contexto fijo: otra clave de 256 bits, que no se
     * puede usar para obtener la del ERP. Es la forma estándar de sacar varias claves de un
     * mismo secreto (derivación de claves).
     */
    static SecretKey deriveKey(String erpSecret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(erpSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Keys.hmacShaKeyFor(mac.doFinal(KEY_CONTEXT.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Could not derive the store token key", e);
        }
    }
}
