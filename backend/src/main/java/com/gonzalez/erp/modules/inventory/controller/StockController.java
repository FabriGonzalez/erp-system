package com.gonzalez.erp.modules.inventory.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;
import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.service.StockService;
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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory/stocks")
@RequiredArgsConstructor
@Tag(
        name = "Inventory - Stocks",
        description = "Operaciones de gestión de stock por sucursal"
)
public class StockController {

    private final StockService stockService;

    @GetMapping
    @Operation(summary = "Listar stocks", description = "Obtiene todos los registros de stock.")
    public ResponseEntity<List<StockResponse>> findAll() {
        return ResponseEntity.ok(stockService.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener stock por ID", description = "Busca y retorna un registro de stock por su identificador.")
    public ResponseEntity<StockResponse> findById(
            @Parameter(description = "ID del stock a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(stockService.findById(id));
    }

    @GetMapping("/product/{productId}")
    @Operation(summary = "Obtener stock por producto", description = "Busca el stock de un producto en todas las sucursales.")
    public ResponseEntity<List<StockResponse>> findByProductId(
            @Parameter(description = "SKU del producto")
            @PathVariable String productId) {
        return ResponseEntity.ok(stockService.findByProductId(productId));
    }

    @GetMapping("/branch/{branchId}")
    @Operation(summary = "Obtener stock por sucursal", description = "Busca el stock de todos los productos en una sucursal.")
    public ResponseEntity<List<StockResponse>> findByBranchId(
            @Parameter(description = "ID de la sucursal")
            @PathVariable Long branchId) {
        return ResponseEntity.ok(stockService.findByBranchId(branchId));
    }

    @PatchMapping("/adjust")
    @Operation(summary = "Ajustar stock", description = "Realiza un ajuste manual de stock. Solo administradores.")
    @ApiResponse(responseCode = "200", description = "Stock ajustado exitosamente")
    @ApiResponse(responseCode = "400", description = "Cantidad negativa o validación inválida",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "El ajuste genera un estado inválido del stock",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class))
    )
    public ResponseEntity<StockResponse> adjustStock(
            @Parameter(description = "Datos del ajuste de stock")
            @Valid @RequestBody StockAdjustRequest request) {
        return ResponseEntity.ok(stockService.adjustStock(request));
    }
}