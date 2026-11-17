package com.gonzalez.erp.modules.transfers.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.transfers.dto.request.StockTransferRequest;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import com.gonzalez.erp.modules.transfers.exception.InvalidStockTransferException;
import com.gonzalez.erp.modules.transfers.service.StockTransferService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventory/transfers")
@RequiredArgsConstructor
@Tag(
        name = "Inventory - Transfers",
        description = "Operaciones de transferencias de stock entre sucursales"
)
public class StockTransferController {

    private static final int MAX_PAGE_SIZE = 100;

    private final StockTransferService stockTransferService;

    @PreAuthorize("hasAnyAuthority('TRANSFERIR_STOCK','CONSULTAR_STOCK')")
    @GetMapping
    @Operation(summary = "Listar transferencias", description = "Lista paginada de las transferencias de la empresa autenticada, de la más nueva a la más vieja. Incluye las anuladas.")
    public ResponseEntity<PageResponse<StockTransferResponse>> findAll(
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0) {
            throw new InvalidStockTransferException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidStockTransferException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return ResponseEntity.ok(stockTransferService.findAll(pageable));
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
