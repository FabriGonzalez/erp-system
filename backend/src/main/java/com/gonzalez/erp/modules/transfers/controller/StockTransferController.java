package com.gonzalez.erp.modules.transfers.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.transfers.dto.request.StockTransferRequest;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import com.gonzalez.erp.modules.transfers.service.StockTransferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory/transfers")
@RequiredArgsConstructor
@Tag(
        name = "Inventory - Transfers",
        description = "Operaciones de transferencias de stock entre sucursales"
)
public class StockTransferController {

    private final StockTransferService stockTransferService;

    @PreAuthorize("hasAnyAuthority('TRANSFERIR_STOCK','CONSULTAR_STOCK')")
    @GetMapping
        @Operation(summary = "Listar transferencias", description = "Obtiene todas las transferencias de stock.")
        public ResponseEntity<List<StockTransferResponse>> findAll() {
                return ResponseEntity.ok(stockTransferService.findAll());
    }

    @PreAuthorize("hasAnyAuthority('TRANSFERIR_STOCK','CONSULTAR_STOCK')")
    @GetMapping("/{id}")
    @Operation(summary = "Obtener transferencia por ID", description = "Busca y retorna una transferencia de stock por su identificador.")
    @ApiResponse(responseCode = "404", description = "Transferencia no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StockTransferResponse> findById(
            @Parameter(description = "ID de la transferencia a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(stockTransferService.findById(id));
    }

    @PreAuthorize("hasAuthority('TRANSFERIR_STOCK')")
    @PostMapping
        @Operation(summary = "Crear transferencia", description = "Ejecuta una transferencia y la crea en estado CONFIRMED.")
    @ApiResponse(responseCode = "201", description = "Transferencia creada exitosamente")
    @ApiResponse(responseCode = "400", description = "Validación inválida (misma sucursal origen/destino o ítems duplicados)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "Sucursal o producto no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
    )
    public ResponseEntity<StockTransferResponse> create(
            @Parameter(description = "Datos de la transferencia")
            @Valid @RequestBody StockTransferRequest request) {
        StockTransferResponse response = stockTransferService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasAuthority('TRANSFERIR_STOCK')")
    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancelar transferencia", description = "Revierte una transferencia confirmada y conserva su historial.")
    @ApiResponse(responseCode = "200", description = "Transferencia cancelada y revertida exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado inválido o stock insuficiente",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Transferencia no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StockTransferResponse> cancel(
            @Parameter(description = "ID de la transferencia a cancelar")
            @PathVariable Long id) {
        return ResponseEntity.ok(stockTransferService.cancel(id));
    }
}
