package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import com.gonzalez.erp.modules.store.dto.StoreCartRequest;
import com.gonzalez.erp.modules.store.service.StoreCartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/store/cart")
@RequiredArgsConstructor
@Tag(name = "Store cart", description = "Carrito de la tienda web (sin login). Enviar X-Store-Domain al probar desde Swagger.")
public class StoreCartController {

    private final StoreCartService cartService;

    @PostMapping("/quote")
    @Operation(summary = "Cotizar el carrito",
            description = "Precios web actuales, disponibilidad por línea, total y sucursales que pueden armar el pedido. No reserva stock.")
    @ApiResponse(responseCode = "200", description = "Carrito cotizado")
    @ApiResponse(responseCode = "400", description = "Datos inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Dominio sin tienda, tienda deshabilitada o empresa no activa (STORE_NOT_FOUND)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreCartQuoteResponse> quote(@Valid @RequestBody StoreCartRequest request) {
        return ResponseEntity.ok(cartService.quote(request));
    }
}
