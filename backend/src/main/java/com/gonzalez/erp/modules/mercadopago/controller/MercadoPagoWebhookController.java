package com.gonzalez.erp.modules.mercadopago.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.gonzalez.erp.modules.mercadopago.service.MercadoPagoWebhookService;
import com.gonzalez.erp.modules.mercadopago.service.MercadoPagoWebhookSignature;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Avisos de Mercado Pago (webhook). Es público: lo llama Mercado Pago, sin token y sin el dominio
 * de ninguna tienda. Lo que lo protege es la firma, y que el pago se consulta siempre a Mercado Pago.
 *
 * 200 = recibido (aunque se ignore); 401 = firma inválida; 502 = Mercado Pago no respondió la
 * consulta y el aviso tiene que reintentarse (cualquier respuesta que no sea 2xx lo reintenta).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/mercadopago")
@RequiredArgsConstructor
@Tag(name = "Mercado Pago", description = "Cuenta de Mercado Pago con la que cobra la tienda web")
public class MercadoPagoWebhookController {

    private final MercadoPagoWebhookSignature signature;
    private final MercadoPagoWebhookService webhookService;

    @PostMapping("/webhook")
    @Operation(summary = "Webhook de pagos", description = "Lo llama Mercado Pago, no el panel.")
    public ResponseEntity<Void> notify(
            @RequestParam(name = "data.id", required = false) String dataId,
            @RequestParam(required = false) String type,
            @RequestHeader(name = "x-signature", required = false) String signatureHeader,
            @RequestHeader(name = "x-request-id", required = false) String requestId,
            @RequestBody(required = false) Notification body) {
        String topic = type != null ? type : (body != null ? body.type() : null);
        // Otros eventos y el formato viejo (IPN, ?topic=&id=) llegan a la misma URL: se ignoran.
        if (!"payment".equals(topic) || dataId == null || dataId.isBlank()) {
            return ResponseEntity.ok().build();
        }
        if (!signature.isValid(signatureHeader, requestId, dataId)) {
            log.warn("Mercado Pago notification with an invalid signature for payment {}", dataId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (body == null || body.userId() == null) {
            log.warn("Mercado Pago notification without user_id for payment {}", dataId);
            return ResponseEntity.ok().build();
        }
        webhookService.handlePayment(body.userId(), dataId);
        return ResponseEntity.ok().build();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Notification(String type, @JsonProperty("user_id") Long userId) {}
}
