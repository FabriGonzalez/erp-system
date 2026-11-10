package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.store.dto.StoreCheckoutErrorResponse;
import com.gonzalez.erp.modules.store.dto.StoreCheckoutRequest;
import com.gonzalez.erp.modules.store.dto.StoreCheckoutResponse;
import com.gonzalez.erp.modules.store.service.StoreCheckoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/store/me/checkout")
@RequiredArgsConstructor
@Tag(name = "Store checkout", description = "Compra del comprador logueado. Requiere Authorization: Bearer con el token de comprador.")
public class StoreCheckoutController {

    private final StoreCheckoutService checkoutService;

    @PostMapping
    @Operation(summary = "Comprar el carrito",
            description = "Vuelve a cotizar el carrito, reserva el stock y crea el pedido esperando el pago. "
                    + "Repetir la misma checkoutKey devuelve el mismo pedido.")
    @ApiResponse(responseCode = "201", description = "Pedido creado (o el ya creado con esa checkoutKey)")
    @ApiResponse(responseCode = "400", description = "Datos inválidos o retiro/envío mal armado (INVALID_DELIVERY)",
            content = @Content(schema = @Schema(implementation = StoreCheckoutErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "La dirección no es una dirección activa del comprador",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "CART_UNAVAILABLE o CART_CHANGED (con la cotización actual), "
            + "PICKUP_NOT_AVAILABLE, PROFILE_INCOMPLETE, ADDRESS_INCOMPLETE, TOO_MANY_PENDING_ORDERS, "
            + "CHECKOUT_KEY_IN_USE o INSUFFICIENT_STOCK (otra compra se llevó lo último)",
            content = @Content(schema = @Schema(implementation = StoreCheckoutErrorResponse.class)))
    public ResponseEntity<StoreCheckoutResponse> checkout(@Valid @RequestBody StoreCheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(checkoutService.checkout(request));
    }
}
