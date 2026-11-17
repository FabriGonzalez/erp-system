package com.gonzalez.erp.config.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(CustomUserDetails userDetails) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("companyId", userDetails.getCompanyId())
                .issuedAt(now)
                .expiration(expiration)
                .signWith(secretKey)
                .compact();
    }

    /** Datos del token que el filtro necesita para autenticar la request. */
    public record ValidatedToken(String username, Instant issuedAt) {}

    /** Devuelve null si la firma es inválida, el token expiró o está mal formado. */
    public ValidatedToken validate(String token) {
        try {
            Claims claims = extractClaims(token);
            Date issuedAt = claims.getIssuedAt();
            return new ValidatedToken(
                    claims.getSubject(),
                    issuedAt != null ? issuedAt.toInstant() : null);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
