package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.store.dto.StoreLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreMeResponse;
import com.gonzalez.erp.modules.store.dto.StoreRegisterRequest;
import com.gonzalez.erp.modules.store.dto.StoreTokenResponse;
import com.gonzalez.erp.modules.store.service.StoreAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Cuentas de comprador. /store/auth/** es público; /store/me/** exige el token de comprador. */
@RestController
@RequestMapping("/api/v1/store")
@RequiredArgsConstructor
@Tag(name = "Store accounts", description = "Registro, login y datos del comprador de la tienda web.")
public class StoreAccountController {

    private final StoreAuthService authService;

    @PostMapping("/auth/register")
    @Operation(summary = "Registrarse",
            description = "Crea una cuenta y una ficha de cliente nuevas (origen WEB) en la tienda del dominio. "
                    + "Responde 202 también si el email ya tenía cuenta, para no revelarlo; no devuelve token: "
                    + "el sitio inicia sesión después con la misma contraseña.")
    @ApiResponse(responseCode = "202", description = "Registro recibido")
    @ApiResponse(responseCode = "400", description = "Datos inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> register(@Valid @RequestBody StoreRegisterRequest request) {
        authService.register(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/auth/login")
    @Operation(summary = "Iniciar sesión", description = "Devuelve el token de comprador (7 días). No exige el email verificado.")
    @ApiResponse(responseCode = "200", description = "Sesión iniciada")
    @ApiResponse(responseCode = "401", description = "Email o contraseña incorrectos (INVALID_CREDENTIALS)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "429", description = "Demasiados intentos fallidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreTokenResponse> login(
            @Valid @RequestBody StoreLoginRequest request, HttpServletRequest httpRequest) {
        // Mismo criterio que el login del ERP: getRemoteAddr, nunca X-Forwarded-For directo.
        return ResponseEntity.ok(authService.login(request, httpRequest.getRemoteAddr()));
    }

    @GetMapping("/me")
    @Operation(summary = "Mis datos", description = "Requiere Authorization: Bearer con el token de comprador.")
    @ApiResponse(responseCode = "200", description = "Datos del comprador")
    @ApiResponse(responseCode = "401", description = "Sin token de comprador válido para esta tienda",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreMeResponse> me() {
        return ResponseEntity.ok(authService.me());
    }
}
