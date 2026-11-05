package com.gonzalez.erp.modules.store.security;

import com.gonzalez.erp.config.security.JwtUtil;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.store.entity.StoreAccount;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;

/** El token de comprador y el de empleado no se aceptan entre sí, aunque salgan del mismo secreto. */
class StoreTokenServiceTest {

    private static final String SECRET = "test-secret-de-al-menos-32-bytes-para-hs256-0123456789";
    private static final long WEEK = 604_800_000L;

    private final StoreTokenService storeTokens = new StoreTokenService(SECRET, WEEK);
    private final JwtUtil erpTokens = new JwtUtil(SECRET, WEEK);

    @Test
    void aStoreTokenCarriesTheAccountAndTheCompany() {
        StoreTokenService.StoreTokenClaims claims = storeTokens.validate(storeTokens.generate(account(5L, 9L)));

        assertThat(claims).isNotNull();
        assertThat(claims.accountId()).isEqualTo(5L);
        assertThat(claims.companyId()).isEqualTo(9L);
        assertThat(claims.issuedAt()).isNotNull();
    }

    @Test
    void theErpDoesNotAcceptAStoreToken() {
        assertThat(erpTokens.validate(storeTokens.generate(account(5L, 9L)))).isNull();
    }

    @Test
    void theStoreDoesNotAcceptATokenSignedWithTheErpKey() {
        // Mismo formato que un token de empleado, con un subject numérico que parece una cuenta.
        String erpLike = Jwts.builder()
                .subject("5").claim("type", StoreTokenService.TYPE).claim("companyId", 9L)
                .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + WEEK))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThat(storeTokens.validate(erpLike)).isNull();
    }

    @Test
    void aTokenWithTheStoreKeyButAnotherTypeIsRejected() {
        String other = Jwts.builder()
                .subject("5").claim("type", "employee").claim("companyId", 9L)
                .issuedAt(new Date()).expiration(new Date(System.currentTimeMillis() + WEEK))
                .signWith(StoreTokenService.deriveKey(SECRET))
                .compact();

        assertThat(storeTokens.validate(other)).isNull();
    }

    @Test
    void expiredOrGarbageTokensAreRejected() {
        StoreTokenService expiring = new StoreTokenService(SECRET, -1000);

        assertThat(storeTokens.validate(expiring.generate(account(5L, 9L)))).isNull();
        assertThat(storeTokens.validate("no-es-un-token")).isNull();
    }

    private static StoreAccount account(Long id, Long companyId) {
        Company company = Company.builder().name("Acme").build();
        company.setId(companyId);
        StoreAccount account = StoreAccount.builder().company(company).email("a@b.com").passwordHash("x").build();
        account.setId(id);
        return account;
    }
}
