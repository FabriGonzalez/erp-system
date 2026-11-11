package com.gonzalez.erp.modules.mercadopago.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gonzalez.erp.common.util.BusinessDate;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class RestMercadoPagoPreferenceClient implements MercadoPagoPreferenceClient {

    private static final String API_URL = "https://api.mercadopago.com";
    // El comprador espera con la compra a medio hacer y el stock bloqueado: no más de 10 segundos.
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(10);
    private static final DateTimeFormatter MP_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

    private final RestClient restClient;

    public RestMercadoPagoPreferenceClient() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().baseUrl(API_URL).requestFactory(requestFactory).build();
    }

    @Override
    public Preference create(String accessToken, PreferenceRequest request) {
        PreferenceResponse response;
        try {
            response = restClient.post()
                    .uri("/checkout/preferences")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + accessToken)
                    .body(body(request))
                    .retrieve()
                    .body(PreferenceResponse.class);
        } catch (RestClientResponseException e) {
            // Sin el cuerpo, que puede traer datos del comprador.
            log.warn("Mercado Pago answered the preference request with status {}", e.getStatusCode().value());
            throw e.getStatusCode().is4xxClientError() ? MercadoPagoException.rejected() : MercadoPagoException.unavailable();
        } catch (RestClientException e) {
            log.warn("Mercado Pago preference request failed: {}", e.getMessage());
            throw MercadoPagoException.unavailable();
        }
        if (response == null || response.id() == null || response.initPoint() == null) {
            log.warn("Mercado Pago preference response is incomplete");
            throw MercadoPagoException.unavailable();
        }
        return new Preference(response.id(), response.initPoint(), response.sandboxInitPoint());
    }

    private static Map<String, Object> body(PreferenceRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        // Un solo ítem por el total: con promos y envío, las líneas sueltas no suman exacto.
        body.put("items", List.of(Map.of(
                "title", request.title(),
                "quantity", 1,
                "currency_id", "ARS",
                "unit_price", request.amount())));
        body.put("payer", Map.of("email", request.payerEmail()));
        body.put("external_reference", request.externalReference());
        body.put("back_urls", Map.of(
                "success", request.backUrl(),
                "pending", request.backUrl(),
                "failure", request.backUrl()));
        // Mercado Pago rechaza auto_return si la URL no es https (desarrollo con http://localhost).
        if (request.backUrl().startsWith("https://")) {
            body.put("auto_return", "approved");
        }
        // Aprobado o rechazado, sin "pendiente": un pago no puede acreditarse horas después,
        // cuando la reserva ya venció.
        body.put("binary_mode", true);
        body.put("expires", true);
        body.put("expiration_date_from", format(Instant.now()));
        body.put("expiration_date_to", format(request.expiresAt()));
        // Sin efectivo (Rapipago, Pago Fácil, Red Link): se acredita después de que vence la reserva.
        body.put("payment_methods", Map.of("excluded_payment_types", List.of(
                Map.of("id", "ticket"),
                Map.of("id", "atm"))));
        return body;
    }

    private static String format(Instant instant) {
        return MP_DATE.format(instant.atZone(BusinessDate.ZONE));
    }

    private record PreferenceResponse(
            String id,
            @JsonProperty("init_point") String initPoint,
            @JsonProperty("sandbox_init_point") String sandboxInitPoint) {
    }
}
