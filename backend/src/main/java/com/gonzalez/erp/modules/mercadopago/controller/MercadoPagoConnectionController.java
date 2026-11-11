package com.gonzalez.erp.modules.mercadopago.controller;

import com.gonzalez.erp.modules.mercadopago.dto.MercadoPagoConnectionResponse;
import com.gonzalez.erp.modules.mercadopago.service.MercadoPagoConnectionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/companies/me/mercadopago")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMINISTRAR_TIENDA')")
@Tag(name = "Mercado Pago", description = "Cuenta de Mercado Pago con la que cobra la tienda web")
public class MercadoPagoConnectionController {

    private final MercadoPagoConnectionService connectionService;

    public record AuthorizationUrlResponse(String authorizationUrl) {}

    @GetMapping
    @Operation(summary = "Ver la conexión", description = "Si la cuenta está conectada, cuál es y cuándo vence. Nunca devuelve tokens.")
    public ResponseEntity<MercadoPagoConnectionResponse> getConnection() {
        return ResponseEntity.ok(connectionService.getConnection());
    }

    // Devuelve la URL en lugar de redirigir: el panel manda el token en un header, y una
    // redirección abierta por el navegador no lo llevaría.
    @GetMapping("/connect")
    @Operation(summary = "Empezar a conectar",
            description = "URL de Mercado Pago para autorizar (vale 10 minutos). Al terminar, Mercado Pago vuelve al callback.")
    public ResponseEntity<AuthorizationUrlResponse> startConnection() {
        return ResponseEntity.ok(new AuthorizationUrlResponse(connectionService.startConnection()));
    }

    @DeleteMapping
    @Operation(summary = "Desconectar",
            description = "Borra los tokens. La autorización se revoca desde la cuenta de Mercado Pago.")
    public ResponseEntity<Void> disconnect() {
        connectionService.disconnect();
        return ResponseEntity.noContent().build();
    }
}
