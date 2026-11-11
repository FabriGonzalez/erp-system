package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.common.crypto.AesGcmTokenCipher;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoOAuthClient;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoOAuthClient.Tokens;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoProperties;
import com.gonzalez.erp.modules.mercadopago.dto.MercadoPagoConnectionResponse;
import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnection;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import com.gonzalez.erp.modules.mercadopago.repository.MercadoPagoConnectionRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
@Transactional(readOnly = true)
public class MercadoPagoConnectionServiceImpl implements MercadoPagoConnectionService {

    private static final String AUTHORIZATION_URL = "https://auth.mercadopago.com/authorization";
    // Lo mismo que vale el código de Mercado Pago: más tiempo no sirve.
    private static final Duration STATE_TTL = Duration.ofMinutes(10);
    private static final String STATE_SEPARATOR = ":";

    private final MercadoPagoProperties properties;
    private final MercadoPagoOAuthClient oauthClient;
    private final AesGcmTokenCipher tokenCipher;
    private final MercadoPagoConnectionRepository connectionRepository;
    private final CompanyRepository companyRepository;
    private final SecureRandom random = new SecureRandom();

    public MercadoPagoConnectionServiceImpl(
            MercadoPagoProperties properties,
            MercadoPagoOAuthClient oauthClient,
            AesGcmTokenCipher tokenCipher,
            MercadoPagoConnectionRepository connectionRepository,
            CompanyRepository companyRepository) {
        this.properties = properties;
        this.oauthClient = oauthClient;
        this.tokenCipher = tokenCipher;
        this.connectionRepository = connectionRepository;
        this.companyRepository = companyRepository;
        // Con Mercado Pago habilitado y sin clave de cifrado, mejor no arrancar que fallar recién
        // cuando un cliente intenta conectar su cuenta.
        if (properties.enabled()) {
            tokenCipher.decrypt(tokenCipher.encrypt("startup-check"));
        }
    }

    @Override
    public MercadoPagoConnectionResponse getConnection() {
        return connectionRepository.findByCompanyId(SecurityUtils.requireCurrentCompanyId())
                .map(connection -> new MercadoPagoConnectionResponse(
                        properties.enabled(),
                        true,
                        connection.getMpUserId(),
                        connection.isLiveMode(),
                        connection.getConnectedAt(),
                        connection.getExpiresAt()))
                .orElseGet(() -> MercadoPagoConnectionResponse.notConnected(properties.enabled()));
    }

    @Override
    public String startConnection() {
        requireEnabled();
        String codeVerifier = randomToken();
        ConnectionState state = new ConnectionState(
                SecurityUtils.requireCurrentCompanyId(),
                SecurityUtils.getCurrentUserId(),
                Instant.now().plus(STATE_TTL).getEpochSecond(),
                codeVerifier);
        return UriComponentsBuilder.fromUriString(AUTHORIZATION_URL)
                .queryParam("client_id", properties.clientId())
                .queryParam("response_type", "code")
                .queryParam("platform_id", "mp")
                .queryParam("redirect_uri", properties.redirectUri())
                .queryParam("state", tokenCipher.encrypt(state.serialize()))
                .queryParam("code_challenge", codeChallenge(codeVerifier))
                .queryParam("code_challenge_method", "S256")
                .encode()
                .build()
                .toUriString();
    }

    @Override
    @Transactional
    public void completeConnection(String code, String state) {
        requireEnabled();
        ConnectionState connectionState = readState(state);
        if (code == null || code.isBlank()) {
            throw MercadoPagoException.connectionFailed();
        }
        Company company = companyRepository.findById(connectionState.companyId())
                .filter(Company::isActive)
                .orElseThrow(MercadoPagoException::invalidState);

        Tokens tokens = oauthClient.exchangeCode(code, connectionState.codeVerifier());

        connectionRepository.findByMpUserId(tokens.userId())
                .filter(other -> !other.getCompany().getId().equals(company.getId()))
                .ifPresent(other -> {
                    throw MercadoPagoException.accountInUse();
                });

        Instant now = Instant.now();
        MercadoPagoConnection connection = connectionRepository.findByCompanyId(company.getId())
                .orElseGet(() -> new MercadoPagoConnection(company));
        connection.connect(
                tokens.userId(),
                tokenCipher.encrypt(tokens.accessToken()),
                tokenCipher.encrypt(tokens.refreshToken()),
                tokens.liveMode(),
                now.plusSeconds(tokens.expiresInSeconds()),
                connectionState.userId(),
                now);
        try {
            // Flush acá: si otra empresa conectó la misma cuenta en paralelo, el índice único salta
            // ahora y se responde como cuenta en uso, no como un error genérico al commitear.
            connectionRepository.saveAndFlush(connection);
        } catch (DataIntegrityViolationException e) {
            throw MercadoPagoException.accountInUse();
        }
    }

    @Override
    @Transactional
    public void disconnect() {
        connectionRepository.findByCompanyId(SecurityUtils.requireCurrentCompanyId())
                .ifPresent(connectionRepository::delete);
    }

    private void requireEnabled() {
        if (!properties.enabled()) {
            throw MercadoPagoException.disabled();
        }
    }

    private ConnectionState readState(String state) {
        if (state == null || state.isBlank()) {
            throw MercadoPagoException.invalidState();
        }
        ConnectionState parsed;
        try {
            parsed = ConnectionState.parse(tokenCipher.decrypt(state));
        } catch (IllegalArgumentException e) {
            throw MercadoPagoException.invalidState();
        }
        if (Instant.now().getEpochSecond() > parsed.expiresAtEpochSecond()) {
            throw MercadoPagoException.invalidState();
        }
        return parsed;
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // PKCE: a Mercado Pago le llega el hash del verificador; el verificador viaja recién al cambiar
    // el código, desde el backend. Un código robado en el camino no sirve sin él.
    private static String codeChallenge(String codeVerifier) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(codeVerifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /**
     * Lo que viaja (cifrado) en el state: la empresa y quién inició la conexión, cuándo vence y el
     * verificador de PKCE. Al ir cifrado no hace falta guardarlo: nadie puede armar uno para otra
     * empresa ni leer el verificador.
     */
    private record ConnectionState(Long companyId, Long userId, long expiresAtEpochSecond, String codeVerifier) {

        String serialize() {
            return companyId + STATE_SEPARATOR + (userId == null ? "" : userId)
                    + STATE_SEPARATOR + expiresAtEpochSecond + STATE_SEPARATOR + codeVerifier;
        }

        static ConnectionState parse(String value) {
            String[] parts = value.split(STATE_SEPARATOR, -1);
            if (parts.length != 4 || parts[3].isBlank()) {
                throw new IllegalArgumentException("Malformed state");
            }
            try {
                return new ConnectionState(
                        Long.parseLong(parts[0]),
                        parts[1].isEmpty() ? null : Long.parseLong(parts[1]),
                        Long.parseLong(parts[2]),
                        parts[3]);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Malformed state", e);
            }
        }
    }
}
