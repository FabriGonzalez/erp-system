package com.gonzalez.erp.modules.mercadopago.service;

import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Firma de los avisos de Mercado Pago. El header {@code x-signature} trae {@code ts=...,v1=...};
 * v1 es el HMAC-SHA256 (en hex) con la clave secreta de la app sobre
 * {@code id:<data.id>;request-id:<x-request-id>;ts:<ts>;}. Si falta un dato, su parte no va.
 */
@Component
@RequiredArgsConstructor
public class MercadoPagoWebhookSignature {

    private final MercadoPagoProperties properties;

    public boolean isValid(String signatureHeader, String requestId, String dataId) {
        String secret = properties.webhookSecret();
        if (secret.isEmpty() || signatureHeader == null) {
            return false;
        }

        String ts = null;
        String v1 = null;
        for (String part : signatureHeader.split(",")) {
            String[] pair = part.split("=", 2);
            if (pair.length != 2) {
                continue;
            }
            switch (pair[0].trim()) {
                case "ts" -> ts = pair[1].trim();
                case "v1" -> v1 = pair[1].trim();
                default -> { }
            }
        }
        if (ts == null || v1 == null) {
            return false;
        }

        StringBuilder manifest = new StringBuilder();
        if (dataId != null && !dataId.isBlank()) {
            // Mercado Pago firma los ids alfanuméricos en minúscula.
            manifest.append("id:").append(dataId.toLowerCase(Locale.ROOT)).append(';');
        }
        if (requestId != null && !requestId.isBlank()) {
            manifest.append("request-id:").append(requestId).append(';');
        }
        manifest.append("ts:").append(ts).append(';');

        byte[] expected = hmac(secret, manifest.toString()).getBytes(StandardCharsets.UTF_8);
        // Comparación de tiempo constante: no deja adivinar la firma byte a byte.
        return MessageDigest.isEqual(expected, v1.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
    }

    static String hmac(String secret, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(message.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HmacSHA256 is not available", e);
        }
    }
}
