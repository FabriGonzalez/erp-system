package com.gonzalez.erp.modules.auth.controller;

import com.gonzalez.erp.modules.auth.dto.request.ChangePasswordRequest;
import com.gonzalez.erp.modules.auth.dto.request.LoginRequest;
import com.gonzalez.erp.modules.auth.dto.response.CurrentUserResponse;
import com.gonzalez.erp.modules.auth.dto.response.LoginResponse;
import com.gonzalez.erp.modules.auth.dto.response.TokenResponse;
import com.gonzalez.erp.modules.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Autenticación de usuarios")
public class AuthController {

    private final AuthService authService;

    // Se usa getRemoteAddr y no X-Forwarded-For: ese header lo controla el cliente y
    // permitiría esquivar el límite por IP. Detrás de un proxy hay que configurar
    // server.forward-headers-strategy para que getRemoteAddr devuelva la IP real.
    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Autentica un usuario y retorna un token JWT")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Autenticación exitosa"),
            @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
            @ApiResponse(responseCode = "403", description = "La empresa está suspendida o cancelada"),
            @ApiResponse(responseCode = "429", description = "Demasiados intentos fallidos")
    })
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.login(request, httpRequest.getRemoteAddr()));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Cambiar la contraseña propia",
               description = "Requiere la contraseña actual. Revoca las sesiones abiertas y devuelve un token nuevo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Contraseña cambiada; incluye el token nuevo"),
            @ApiResponse(responseCode = "400", description = "Contraseña actual incorrecta o nueva inválida"),
            @ApiResponse(responseCode = "429", description = "Demasiados intentos fallidos")
    })
    public ResponseEntity<TokenResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.changePassword(request, httpRequest.getRemoteAddr()));
    }

    @GetMapping("/me")
    @Operation(summary = "Usuario de la sesión",
               description = "Rol y permisos vigentes del usuario autenticado, para refrescar los del login.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Datos del usuario autenticado"),
            @ApiResponse(responseCode = "401", description = "Sesión inválida, usuario desactivado o empresa no activa")
    })
    public ResponseEntity<CurrentUserResponse> me() {
        return ResponseEntity.ok(authService.currentUser());
    }
}
