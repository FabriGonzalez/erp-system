package com.gonzalez.erp.modules.inventory.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.inventory.dto.request.StockAdjustRequest;
import com.gonzalez.erp.modules.inventory.dto.response.StockResponse;
import com.gonzalez.erp.modules.inventory.exception.InvalidStockQueryException;
import com.gonzalez.erp.modules.inventory.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    private static final int MAX_PAGE_SIZE = 100;

    private final StockService stockService;

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','TRANSFERIR_STOCK','CREAR_PEDIDOS')")
    @GetMapping
    @Operation(summary = "Listar stocks",
               description = "Paginado, por nombre de producto y SKU. Filtros opcionales: branchId, q (producto o SKU, "
                       + "sin distinguir mayúsculas ni tildes) y variantIds (stock de esas variantes).")
    @ApiResponse(responseCode = "400", description = "Parámetros de paginación inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PageResponse<StockResponse>> search(
            @Parameter(description = "ID de la sucursal")
            @RequestParam(required = false) Long branchId,
            @Parameter(description = "Texto a buscar en el producto o el SKU")
            @RequestParam(required = false) String q,
            @Parameter(description = "IDs de variante, separados por coma")
            @RequestParam(required = false) List<Long> variantIds,
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidStockQueryException(
                    "page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
        // El id desempata para que la paginación sea estable.
        Sort sort = Sort.by("productVariant.product.name", "productVariant.sku", "id");
        return ResponseEntity.ok(stockService.search(branchId, q, variantIds, PageRequest.of(page, size, sort)));
    }

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','TRANSFERIR_STOCK','CREAR_PEDIDOS')")
    @GetMapping("/{id}")
    @Operation(summary = "Obtener stock por ID", description = "Busca y retorna un registro de stock por su identificador.")
    public ResponseEntity<StockResponse> findById(
            @Parameter(description = "ID del stock a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(stockService.findById(id));
    }

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','TRANSFERIR_STOCK','CREAR_PEDIDOS')")
    @GetMapping("/variant/{productVariantId}")
    @Operation(summary = "Obtener stock por variante", description = "Busca el stock de una variante de producto en todas las sucursales.")
    public ResponseEntity<List<StockResponse>> findByProductVariantId(
            @Parameter(description = "ID de la variante de producto")
            @PathVariable Long productVariantId) {
        return ResponseEntity.ok(stockService.findByProductVariantId(productVariantId));
    }

    @PreAuthorize("hasAnyAuthority('CONSULTAR_STOCK','AJUSTAR_STOCK','TRANSFERIR_STOCK','CREAR_PEDIDOS')")
    @GetMapping("/branch/{branchId}")
    @Operation(summary = "Obtener stock por sucursal", description = "Busca el stock de todos los productos en una sucursal.")
    public ResponseEntity<List<StockResponse>> findByBranchId(
            @Parameter(description = "ID de la sucursal")
            @PathVariable Long branchId) {
        return ResponseEntity.ok(stockService.findByBranchId(branchId));
    }

    @PreAuthorize("hasAuthority('AJUSTAR_STOCK')")
    @PatchMapping("/adjust")
    @Operation(summary = "Ajustar stock", description = "Ajusta la cantidad final del stock. quantity en el movimiento es el delta firmado (newQuantity - previousQuantity); requiere AJUSTAR_STOCK.")
    @ApiResponse(responseCode = "200", description = "Stock ajustado exitosamente")
    @ApiResponse(responseCode = "400", description = "Cantidad negativa o validación inválida",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
        @ApiResponse(responseCode = "403", description = "Sin permiso AJUSTAR_STOCK",
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
