package com.gonzalez.erp.modules.store.security;

import com.gonzalez.erp.modules.store.exception.StoreAuthException;
import com.gonzalez.erp.modules.store.security.GoogleTokenVerifier.GoogleIdentity;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/* Una clave RSA de prueba hace de la clave de Google: se valida de verdad la firma y cada claim. */
class GoogleTokenVerifierTest {

    private static final String CLIENT_ID = "nuestra-app.apps.googleusercontent.com";

    private static KeyPair googleKeys;
    private static KeyPair otherKeys;

    @BeforeAll
    static void generateKeys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        googleKeys = generator.generateKeyPair();
        otherKeys = generator.generateKeyPair();
    }

    @Test
    void aValidTokenGivesTheIdentity() throws Exception {
        GoogleIdentity identity = verifier().verify(sign(validClaims().build(), googleKeys));

        assertThat(identity).isEqualTo(new GoogleIdentity("sub-1", "ana@gmail.com", true, "Ana", "Paz"));
    }

    @Test
    void bothFormsOfTheIssuerAreAccepted() throws Exception {
        assertThat(verifier().verify(sign(validClaims().issuer("accounts.google.com").build(), googleKeys)).subject())
                .isEqualTo("sub-1");
    }

    @Test
    void emailVerifiedCanComeAsTextAndNamesCanBeMissing() throws Exception {
        String token = sign(validClaims().claim("email_verified", "true")
                .claim("given_name", null).claim("family_name", null).build(), googleKeys);

        GoogleIdentity identity = verifier().verify(token);

        assertThat(identity.emailVerified()).isTrue();
        assertThat(identity.givenName()).isNull();
        assertThat(identity.familyName()).isNull();
    }

    @Test
    void anUnconfirmedEmailIsReported() throws Exception {
        String token = sign(validClaims().claim("email_verified", false).build(), googleKeys);

        assertThat(verifier().verify(token).emailVerified()).isFalse();
    }

    @Test
    void aTokenSignedWithAnotherKeyIsRejected() throws Exception {
        assertFails(sign(validClaims().build(), otherKeys));
    }

    @Test
    void aTokenForAnotherAppIsRejected() throws Exception {
        assertFails(sign(validClaims().audience("otra-app.apps.googleusercontent.com").build(), googleKeys));
    }

    @Test
    void aTokenFromAnotherIssuerIsRejected() throws Exception {
        assertFails(sign(validClaims().issuer("https://accounts.example.com").build(), googleKeys));
    }

    @Test
    void anExpiredTokenIsRejected() throws Exception {
        assertFails(sign(validClaims().expirationTime(Date.from(Instant.now().minusSeconds(600))).build(), googleKeys));
    }

    @Test
    void aTokenWithoutEmailIsRejected() throws Exception {
        assertFails(sign(validClaims().claim("email", null).build(), googleKeys));
    }

    @Test
    void garbageIsRejected() {
        assertFails("esto-no-es-un-token");
    }

    @Test
    void withoutClientIdTheLoginIsDisabled() {
        assertCode(new GoogleTokenVerifier(""), "cualquiera", "GOOGLE_LOGIN_DISABLED");
    }

    @Test
    void notReachingGoogleIsNotTheBuyersFault() {
        NimbusJwtDecoder decoder = Mockito.mock(NimbusJwtDecoder.class);
        Mockito.when(decoder.decode("token")).thenThrow(new JwtException("connection refused"));

        assertCode(new GoogleTokenVerifier(CLIENT_ID, decoder), "token", "GOOGLE_LOGIN_UNAVAILABLE");
    }

    private static GoogleTokenVerifier verifier() {
        return new GoogleTokenVerifier(CLIENT_ID,
                NimbusJwtDecoder.withPublicKey((RSAPublicKey) googleKeys.getPublic()).build());
    }

    private static JWTClaimsSet.Builder validClaims() {
        return new JWTClaimsSet.Builder()
                .issuer("https://accounts.google.com")
                .audience(CLIENT_ID)
                .subject("sub-1")
                .issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plusSeconds(600)))
                .claim("email", "ana@gmail.com")
                .claim("email_verified", true)
                .claim("given_name", "Ana")
                .claim("family_name", "Paz");
    }

    private static String sign(JWTClaimsSet claims, KeyPair keys) throws JOSEException {
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims);
        jwt.sign(new RSASSASigner(keys.getPrivate()));
        return jwt.serialize();
    }

    private static void assertFails(String token) {
        assertCode(verifier(), token, "GOOGLE_LOGIN_FAILED");
    }

    private static void assertCode(GoogleTokenVerifier verifier, String token, String code) {
        assertThatThrownBy(() -> verifier.verify(token))
                .isInstanceOfSatisfying(StoreAuthException.class, e -> assertThat(e.getCode()).isEqualTo(code));
    }
}
