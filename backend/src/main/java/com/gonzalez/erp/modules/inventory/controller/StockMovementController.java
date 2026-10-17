package com.gonzalez.erp.modules.inventory.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.inventory.dto.response.StockMovementResponse;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import com.gonzalez.erp.modules.inventory.exception.InvalidStockMovementQueryException;
import com.gonzalez.erp.modules.inventory.service.StockMovementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inventory/movements")
@RequiredArgsConstructor
@Tag(
        name = "Inventory - Movements",
        description = "Consulta de movimientos históricos de stock"
)
public class StockMovementController {

    private static final int MAX_PAGE_SIZE = 100;

    private final StockMovementService stockMovementService;

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','VER_REPORTES')")
    @GetMapping
    @Operation(summary = "Listar movimientos",
               description = "Lista paginada de los movimientos de stock de la empresa, del más nuevo al más viejo. "
                       + "Todos los filtros son opcionales.")
    @ApiResponse(responseCode = "404", description = "El stock indicado no existe",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PageResponse<StockMovementResponse>> search(
            @Parameter(description = "ID del registro de stock (variante en una sucursal)")
            @RequestParam(required = false) Long stockId,
            @Parameter(description = "ID de la sucursal")
            @RequestParam(required = false) Long branchId,
            @Parameter(description = "ID de la variante")
            @RequestParam(required = false) Long productVariantId,
            @Parameter(description = "Tipo de movimiento")
            @RequestParam(required = false) StockMovementType type,
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0) {
            throw new InvalidStockMovementQueryException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidStockMovementQueryException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return ResponseEntity.ok(stockMovementService.search(stockId, branchId, productVariantId, type, pageable));
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
}
