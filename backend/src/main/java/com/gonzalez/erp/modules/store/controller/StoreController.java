package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.store.dto.StoreInfoResponse;
import com.gonzalez.erp.modules.store.web.CurrentStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints públicos de la tienda web. La tienda se identifica por Origin o X-Store-Domain. */
@RestController
@RequestMapping("/api/v1/store")
@Tag(name = "Store", description = "Tienda web pública (sin login). Enviar X-Store-Domain al probar desde Swagger.")
public class StoreController {

    @GetMapping("/info")
    @Operation(summary = "Datos de la tienda", description = "Nombre y dominio de la tienda del dominio que hace el pedido.")
    @ApiResponse(responseCode = "404", description = "Dominio sin tienda, tienda deshabilitada o empresa no activa (STORE_NOT_FOUND)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreInfoResponse> info() {
        CurrentStore store = CurrentStore.require();
        return ResponseEntity.ok(new StoreInfoResponse(store.name(), store.domain()));
    }
}
