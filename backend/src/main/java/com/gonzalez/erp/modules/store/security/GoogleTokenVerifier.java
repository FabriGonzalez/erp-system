package com.gonzalez.erp.modules.store.security;

import com.gonzalez.erp.modules.store.exception.StoreAuthException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.List;
import java.util.Set;

/**
 * Valida el ID token que Google le da al sitio: la firma con las claves públicas de Google, que
 * lo haya emitido Google, que sea para nuestra app (sin esto serviría el token de cualquier otro
 * sitio con "Continuar con Google") y que no esté vencido.
 */
@Slf4j
@Component
public class GoogleTokenVerifier {

    private static final String GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Duration GOOGLE_TIMEOUT = Duration.ofSeconds(5);
    // Google usa las dos formas del emisor.
    private static final Set<String> GOOGLE_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    public record GoogleIdentity(String subject, String email, boolean emailVerified, String givenName, String familyName) {}

    /** Null cuando no hay Client ID configurado. */
    private final NimbusJwtDecoder decoder;

    @Autowired
    public GoogleTokenVerifier(@Value("${app.store.google-client-id:}") String clientId) {
        this(clientId, clientId.isBlank() ? null : googleDecoder());
    }

    GoogleTokenVerifier(String clientId, NimbusJwtDecoder decoder) {
        this.decoder = decoder;
        if (decoder != null) {
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                    JwtValidators.createDefault(),
                    new JwtClaimValidator<Object>(JwtClaimNames.ISS,
                            issuer -> issuer != null && GOOGLE_ISSUERS.contains(issuer.toString())),
                    new JwtClaimValidator<List<String>>(JwtClaimNames.AUD,
                            audience -> audience != null && audience.contains(clientId))));
        }
    }

    public GoogleIdentity verify(String idToken) {
        if (decoder == null) {
            throw StoreAuthException.googleLoginDisabled();
        }
        Jwt jwt = decode(idToken);
        String email = jwt.getClaimAsString("email");
        if (jwt.getSubject() == null || email == null || email.isBlank()) {
            throw StoreAuthException.googleLoginFailed();
        }
        return new GoogleIdentity(
                jwt.getSubject(),
                email,
                // Según el flujo, Google lo manda como booleano o como texto.
                Boolean.parseBoolean(String.valueOf(jwt.getClaims().get("email_verified"))),
                jwt.getClaimAsString("given_name"),
                jwt.getClaimAsString("family_name"));
    }

    private Jwt decode(String idToken) {
        try {
            return decoder.decode(idToken);
        } catch (BadJwtException e) {
            throw StoreAuthException.googleLoginFailed();
        } catch (JwtException e) {
            // El token puede estar bien: lo que falló es traer las claves de Google.
            log.warn("Could not verify a Google token: {}", e.getMessage());
            throw StoreAuthException.googleLoginUnavailable();
        }
    }

    // Las claves se piden recién con el primer login y la librería las guarda y las renueva cuando rotan.
    private static NimbusJwtDecoder googleDecoder() {
        SimpleClientHttpRequestFactory requests = new SimpleClientHttpRequestFactory();
        requests.setConnectTimeout(GOOGLE_TIMEOUT);
        requests.setReadTimeout(GOOGLE_TIMEOUT);
        return NimbusJwtDecoder.withJwkSetUri(GOOGLE_KEYS_URL)
                .jwsAlgorithm(SignatureAlgorithm.RS256)
                .restOperations(new RestTemplate(requests))
                .build();
    }
}
