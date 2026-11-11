package com.gonzalez.erp.modules.mercadopago.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Component
public class RestMercadoPagoOAuthClient implements MercadoPagoOAuthClient {

    private static final String API_URL = "https://api.mercadopago.com";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);

    private final MercadoPagoProperties properties;
    private final RestClient restClient;

    public RestMercadoPagoOAuthClient(MercadoPagoProperties properties) {
        this.properties = properties;
        // Timeouts cortos: el admin está esperando en el navegador y un Mercado Pago colgado no
        // tiene que dejar hilos tomados.
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().baseUrl(API_URL).requestFactory(requestFactory).build();
    }

    @Override
    public Tokens exchangeCode(String code, String codeVerifier) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("client_id", properties.clientId());
        body.put("client_secret", properties.clientSecret());
        body.put("grant_type", "authorization_code");
        body.put("code", code);
        body.put("redirect_uri", properties.redirectUri());
        body.put("code_verifier", codeVerifier);
        body.put("test_token", properties.testMode());
        return requestTokens(body);
    }

    private Tokens requestTokens(Map<String, Object> body) {
        TokenResponse response;
        try {
            response = restClient.post()
                    .uri("/oauth/token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(TokenResponse.class);
        } catch (RestClientResponseException e) {
            // Sin el cuerpo: alcanza con el estado, y así no hay riesgo de loguear datos de la cuenta.
            log.warn("Mercado Pago rejected the token request with status {}", e.getStatusCode().value());
            throw MercadoPagoException.connectionFailed();
        } catch (RestClientException e) {
            log.warn("Mercado Pago token request failed: {}", e.getMessage());
            throw MercadoPagoException.connectionFailed();
        }
        if (response == null || isBlank(response.accessToken()) || isBlank(response.refreshToken())
                || response.userId() == null || response.expiresIn() == null) {
            log.warn("Mercado Pago token response is incomplete");
            throw MercadoPagoException.connectionFailed();
        }
        return new Tokens(response.accessToken(), response.refreshToken(), response.expiresIn(),
                response.userId(), Boolean.TRUE.equals(response.liveMode()));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record TokenResponse(
            @JsonProperty("access_token") String accessToken,
            @JsonProperty("refresh_token") String refreshToken,
            @JsonProperty("expires_in") Long expiresIn,
            @JsonProperty("user_id") Long userId,
            @JsonProperty("live_mode") Boolean liveMode) {
    }
}
