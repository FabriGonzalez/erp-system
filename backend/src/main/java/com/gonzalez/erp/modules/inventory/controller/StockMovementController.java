package com.gonzalez.erp.modules.inventory.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.service.StockMovementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory/movements")
@RequiredArgsConstructor
@Tag(
        name = "Inventory - Movements",
        description = "Consulta de movimientos históricos de stock"
)
public class StockMovementController {

    private final StockMovementService stockMovementService;

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','VER_REPORTES')")
    @GetMapping
    @Operation(summary = "Listar movimientos", description = "Obtiene todos los movimientos de stock.")
    public ResponseEntity<List<StockMovementResponse>> findAll() {
        return ResponseEntity.ok(stockMovementService.findAll());
    }

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','VER_REPORTES')")
    @GetMapping("/{id}")
    @Operation(summary = "Obtener movimiento por ID", description = "Busca y retorna un movimiento de stock por su identificador.")
    @ApiResponse(responseCode = "404", description = "Movimiento no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StockMovementResponse> findById(
            @Parameter(description = "ID del movimiento a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(stockMovementService.findById(id));
    }

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','VER_REPORTES')")
    @GetMapping("/stock/{stockId}")
    @Operation(summary = "Obtener movimientos por stock", description = "Busca todos los movimientos asociados a un registro de stock.")
    @ApiResponse(responseCode = "404", description = "Stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<List<StockMovementResponse>> findByStockId(
            @Parameter(description = "ID del registro de stock")
            @PathVariable Long stockId) {
        return ResponseEntity.ok(stockMovementService.findByStockId(stockId));
    }

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','VER_REPORTES')")
    @GetMapping("/type/{type}")
    @Operation(summary = "Obtener movimientos por tipo", description = "Filtra movimientos de stock por tipo.")
    public ResponseEntity<List<StockMovementResponse>> findByType(
            @Parameter(description = "Tipo de movimiento de stock")
            @PathVariable StockMovementType type) {
        return ResponseEntity.ok(stockMovementService.findByType(type));
    }
}