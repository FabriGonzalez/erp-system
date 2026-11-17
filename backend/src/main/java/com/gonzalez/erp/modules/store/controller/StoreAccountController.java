package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.store.dto.StoreChangePasswordRequest;
import com.gonzalez.erp.modules.store.dto.StoreEmailRequest;
import com.gonzalez.erp.modules.store.dto.StoreGoogleLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreLinkTokenRequest;
import com.gonzalez.erp.modules.store.dto.StoreLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreMeResponse;
import com.gonzalez.erp.modules.store.dto.StoreRegisterRequest;
import com.gonzalez.erp.modules.store.dto.StoreResetPasswordRequest;
import com.gonzalez.erp.modules.store.dto.StoreTokenResponse;
import com.gonzalez.erp.modules.store.dto.StoreUpdateProfileRequest;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Cuentas de comprador. /store/auth/** es público; /store/me/** exige el token de comprador. */
@RestController
@RequestMapping("/api/v1/store")
@RequiredArgsConstructor
@Tag(name = "Store accounts", description = "Registro con verificación de email, login, recuperación de contraseña y datos del comprador de la tienda web.")
public class StoreAccountController {

    private final StoreAuthService authService;

    @PostMapping("/auth/register")
    @Operation(summary = "Registrarse",
            description = "Deja el registro pendiente y manda un mail con el link de verificación (48 h). La cuenta "
                    + "y la ficha de cliente (origen WEB) se crean recién al verificar. Responde 202 también si el "
                    + "email ya tenía cuenta, para no revelarlo; en ese caso al dueño le llega un aviso.")
    @ApiResponse(responseCode = "202", description = "Registro recibido")
    @ApiResponse(responseCode = "400", description = "Datos inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "429", description = "Demasiados pedidos para ese email o desde esa IP",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> register(
            @Valid @RequestBody StoreRegisterRequest request, HttpServletRequest httpRequest) {
        authService.register(request, httpRequest.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/auth/verify-email")
    @Operation(summary = "Verificar el email",
            description = "Recibe el token del link /cuenta/verificar?token=… y crea la cuenta y la ficha. "
                    + "No inicia sesión: el sitio lleva al login.")
    @ApiResponse(responseCode = "204", description = "Email verificado y cuenta creada")
    @ApiResponse(responseCode = "400", description = "Link vencido, usado o inválido (INVALID_LINK)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> verifyEmail(@Valid @RequestBody StoreLinkTokenRequest request) {
        authService.verifyEmail(request.token());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/auth/resend-verification")
    @Operation(summary = "Reenviar la verificación",
            description = "Manda un link nuevo para el último registro pendiente del email; el anterior deja de "
                    + "servir. Responde 202 siempre, exista o no el registro.")
    @ApiResponse(responseCode = "202", description = "Pedido recibido")
    @ApiResponse(responseCode = "429", description = "Demasiados pedidos para ese email o desde esa IP",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> resendVerification(
            @Valid @RequestBody StoreEmailRequest request, HttpServletRequest httpRequest) {
        authService.resendVerification(request.email(), httpRequest.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/auth/login")
    @Operation(summary = "Iniciar sesión", description = "Devuelve el token de comprador (7 días). Exige el email verificado.")
    @ApiResponse(responseCode = "200", description = "Sesión iniciada")
    @ApiResponse(responseCode = "401", description = "Email o contraseña incorrectos (INVALID_CREDENTIALS)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Contraseña correcta pero el email no está verificado (EMAIL_NOT_VERIFIED)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "429", description = "Demasiados intentos fallidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreTokenResponse> login(
            @Valid @RequestBody StoreLoginRequest request, HttpServletRequest httpRequest) {
        // Mismo criterio que el login del ERP: getRemoteAddr, nunca X-Forwarded-For directo.
        return ResponseEntity.ok(authService.login(request, httpRequest.getRemoteAddr()));
    }

    @PostMapping("/auth/google")
    @Operation(summary = "Continuar con Google",
            description = "Recibe el ID token que Google le dio al sitio y devuelve el token de comprador (7 días). "
                    + "Si el email confirmado por Google ya tenía cuenta en esta tienda la vincula; si no, crea la "
                    + "cuenta y una ficha de cliente nueva (origen WEB).")
    @ApiResponse(responseCode = "200", description = "Sesión iniciada")
    @ApiResponse(responseCode = "400", description = "Falta el token",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "401", description = "No se pudo iniciar sesión con esa cuenta de Google (GOOGLE_LOGIN_FAILED)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "503", description = "Google no configurado (GOOGLE_LOGIN_DISABLED) o no disponible (GOOGLE_LOGIN_UNAVAILABLE)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreTokenResponse> loginWithGoogle(@Valid @RequestBody StoreGoogleLoginRequest request) {
        return ResponseEntity.ok(authService.loginWithGoogle(request.idToken()));
    }

    @PostMapping("/auth/forgot-password")
    @Operation(summary = "Olvidé mi contraseña",
            description = "Manda un link a /cuenta/restablecer?token=… que vence en 1 hora y sirve una vez; los "
                    + "links anteriores dejan de servir. Responde 202 siempre, tenga o no cuenta el email.")
    @ApiResponse(responseCode = "202", description = "Pedido recibido")
    @ApiResponse(responseCode = "429", description = "Demasiados pedidos para ese email o desde esa IP",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> forgotPassword(
            @Valid @RequestBody StoreEmailRequest request, HttpServletRequest httpRequest) {
        authService.forgotPassword(request.email(), httpRequest.getRemoteAddr());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/auth/reset-password")
    @Operation(summary = "Restablecer la contraseña",
            description = "Recibe el token del link y la contraseña nueva. Cierra las sesiones abiertas y avisa "
                    + "por mail. No inicia sesión: el sitio lleva al login.")
    @ApiResponse(responseCode = "204", description = "Contraseña cambiada")
    @ApiResponse(responseCode = "400", description = "Contraseña inválida, o link vencido, usado o inválido (INVALID_LINK)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody StoreResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Mis datos", description = "Requiere Authorization: Bearer con el token de comprador.")
    @ApiResponse(responseCode = "200", description = "Datos del comprador")
    @ApiResponse(responseCode = "401", description = "Sin token de comprador válido para esta tienda",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreMeResponse> me() {
        return ResponseEntity.ok(authService.me());
    }

    @PatchMapping("/me")
    @Operation(summary = "Editar mis datos",
            description = "Recibe el formulario completo: un teléfono vacío o ausente se borra. El email no se cambia.")
    @ApiResponse(responseCode = "200", description = "Datos actualizados")
    @ApiResponse(responseCode = "400", description = "Datos inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreMeResponse> updateProfile(@Valid @RequestBody StoreUpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(request));
    }

    @PatchMapping("/me/password")
    @Operation(summary = "Cambiar mi contraseña",
            description = "Cierra las demás sesiones, avisa por mail y devuelve un token nuevo para esta sesión.")
    @ApiResponse(responseCode = "200", description = "Contraseña cambiada; el token anterior ya no vale")
    @ApiResponse(responseCode = "400",
            description = "Contraseña inválida, INVALID_CURRENT_PASSWORD, PASSWORD_UNCHANGED o PASSWORD_NOT_SET (cuenta de Google)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "429", description = "Demasiados intentos fallidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreTokenResponse> changePassword(
            @Valid @RequestBody StoreChangePasswordRequest request, HttpServletRequest httpRequest) {
        return ResponseEntity.ok(authService.changePassword(request, httpRequest.getRemoteAddr()));
    }
}
