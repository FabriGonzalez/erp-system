package com.gonzalez.erp.modules.mercadopago.controller;

import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import com.gonzalez.erp.modules.mercadopago.service.MercadoPagoConnectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/**
 * Adonde vuelve Mercado Pago después de que el admin autoriza (o rechaza). Es público: llega el
 * navegador del admin sin el token del ERP, y la empresa sale del state cifrado.
 *
 * Responde HTML y no JSON porque lo ve una persona en una pestaña del navegador. Cuando exista
 * el panel de la tienda, esto pasa a redirigir ahí con el resultado.
 */
@RestController
@RequestMapping("/api/v1/mercadopago/oauth")
@RequiredArgsConstructor
@Tag(name = "Mercado Pago", description = "Cuenta de Mercado Pago con la que cobra la tienda web")
public class MercadoPagoOAuthCallbackController {

    private final MercadoPagoConnectionService connectionService;

    @GetMapping("/callback")
    @Operation(summary = "Callback de OAuth", description = "Lo llama Mercado Pago, no el panel.")
    public ResponseEntity<String> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) {
        if (error != null) {
            return page(HttpStatus.OK, "No se conectó la cuenta",
                    "Cancelaste la autorización en Mercado Pago. Podés volver a intentarlo desde el panel.");
        }
        try {
            connectionService.completeConnection(code, state);
            return page(HttpStatus.OK, "Cuenta conectada",
                    "La tienda ya puede cobrar con Mercado Pago. Podés cerrar esta pestaña.");
        } catch (MercadoPagoException e) {
            return page(e.getStatus(), "No se pudo conectar la cuenta", messageFor(e.getCode()));
        }
    }

    private static String messageFor(String code) {
        return switch (code) {
            case "MERCADOPAGO_ACCOUNT_IN_USE" ->
                    "Esta cuenta de Mercado Pago ya está conectada a otra empresa. Usá otra cuenta.";
            case "MERCADOPAGO_INVALID_STATE" ->
                    "El link venció o no es válido. Volvé a empezar desde el panel.";
            case "MERCADOPAGO_DISABLED" -> "Mercado Pago no está habilitado en la plataforma.";
            default -> "Mercado Pago no respondió como esperábamos. Volvé a intentarlo en unos minutos.";
        };
    }

    // Textos fijos (nada que venga del request), así que no hace falta escapar.
    private static ResponseEntity<String> page(HttpStatus status, String title, String message) {
        String html = """
                <!doctype html>
                <html lang="es">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s</title>
                <style>
                body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #1a1a1a; margin: 0;
                       display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 16px; }
                main { background: #fff; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; }
                h1 { font-size: 1.4rem; margin: 0 0 12px; }
                p { margin: 0; line-height: 1.5; color: #444; }
                </style>
                </head>
                <body><main><h1>%s</h1><p>%s</p></main></body>
                </html>
                """.formatted(title, title, message);
        return ResponseEntity.status(status)
                .contentType(new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8))
                .cacheControl(CacheControl.noStore())
                // La URL trae el código de Mercado Pago: que no viaje como Referer a ningún lado.
                .header("Referrer-Policy", "no-referrer")
                .body(html);
    }
}
