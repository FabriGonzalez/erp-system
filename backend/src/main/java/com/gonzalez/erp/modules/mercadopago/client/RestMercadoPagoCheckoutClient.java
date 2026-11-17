package com.gonzalez.erp.modules.mercadopago.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.gonzalez.erp.common.util.BusinessDate;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

@Slf4j
@Component
public class RestMercadoPagoCheckoutClient implements MercadoPagoCheckoutClient {

    private static final String API_URL = "https://api.mercadopago.com";
    // El comprador espera con el stock bloqueado, y Mercado Pago espera la respuesta del webhook
    // 22 segundos (consulta + devolución): ninguna llamada pasa de 8.
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    private static final Duration READ_TIMEOUT = Duration.ofSeconds(8);
    private static final DateTimeFormatter MP_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");

    private final RestClient restClient;
    private final MercadoPagoProperties properties;

    public RestMercadoPagoCheckoutClient(MercadoPagoProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT);
        requestFactory.setReadTimeout(READ_TIMEOUT);
        this.restClient = RestClient.builder().baseUrl(API_URL).requestFactory(requestFactory).build();
        this.properties = properties;
    }

    @Override
    public Preference createPreference(String accessToken, PreferenceRequest request) {
        PreferenceResponse response = send("the preference creation", () -> restClient.post()
                .uri("/checkout/preferences")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body(preferenceBody(request))
                .retrieve()
                .body(PreferenceResponse.class));
        if (response == null || response.id() == null || response.initPoint() == null) {
            log.warn("Mercado Pago preference response is incomplete");
            throw MercadoPagoException.unavailable();
        }
        return new Preference(response.id(), response.initPoint(), response.sandboxInitPoint());
    }

    @Override
    public void expirePreference(String accessToken, String preferenceId) {
        send("the preference expiration", () -> restClient.put()
                .uri("/checkout/preferences/{id}", preferenceId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + accessToken)
                .body(Map.of("expires", true, "expiration_date_to", format(Instant.now())))
                .retrieve()
                .toBodilessEntity());
    }

    @Override
    public Optional<Payment> findPayment(String accessToken, String paymentId) {
        PaymentResponse response = send("the payment lookup", () -> {
            try {
                return restClient.get()
                        .uri("/v1/payments/{id}", paymentId)
                        .accept(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + accessToken)
                        .retrieve()
                        .body(PaymentResponse.class);
            } catch (RestClientResponseException e) {
                // No es un error: esa cuenta no tiene ese pago.
                if (e.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                    return null;
                }
                throw e;
            }
        });
        if (response == null) {
            return Optional.empty();
        }
        if (response.id() == null) {
            throw MercadoPagoException.unavailable();
        }
        return Optional.of(new Payment(String.valueOf(response.id()), response.status(),
                response.externalReference(), response.transactionAmount(), response.currencyId()));
    }

    @Override
    public void refundPayment(String accessToken, String paymentId) {
        send("the refund of payment " + paymentId, () -> restClient.post()
                .uri("/v1/payments/{id}/refunds", paymentId)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + accessToken)
                // La misma clave para el mismo pago: si el webhook se repite, Mercado Pago no devuelve dos veces.
                .header("X-Idempotency-Key", "refund-" + paymentId)
                // Sin importe: devolución total.
                .body(Map.of())
                .retrieve()
                .toBodilessEntity());
    }

    /**
     * El mismo criterio para todas las llamadas: un 4xx es que Mercado Pago dijo que no, y
     * cualquier otra falla puede andar más tarde. Se loguea solo el estado, nunca el cuerpo, que
     * puede traer datos del comprador.
     */
    private <T> T send(String action, Supplier<T> call) {
        try {
            return call.get();
        } catch (RestClientResponseException e) {
            log.warn("Mercado Pago answered {} with status {}", action, e.getStatusCode().value());
            throw e.getStatusCode().is4xxClientError() ? MercadoPagoException.rejected() : MercadoPagoException.unavailable();
        } catch (RestClientException e) {
            log.warn("Mercado Pago failed on {}: {}", action, e.getMessage());
            throw MercadoPagoException.unavailable();
        }
    }

    private Map<String, Object> preferenceBody(PreferenceRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        // Un solo ítem por el total: con promos y envío, las líneas sueltas no suman exacto.
        body.put("items", List.of(Map.of(
                "title", request.title(),
                "quantity", 1,
                "currency_id", "ARS",
                "unit_price", request.amount())));
        body.put("payer", Map.of("email", request.payerEmail()));
        body.put("external_reference", request.externalReference());
        // Adonde avisa Mercado Pago cada pago (el webhook). Si no hay, el pago se hace pero no se acredita solo.
        if (!properties.notificationUrl().isEmpty()) {
            body.put("notification_url", properties.notificationUrl());
        }
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

    // El pago trae decenas de campos: solo se leen estos.
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PaymentResponse(
            Long id,
            String status,
            @JsonProperty("external_reference") String externalReference,
            @JsonProperty("transaction_amount") BigDecimal transactionAmount,
            @JsonProperty("currency_id") String currencyId) {
    }
}
