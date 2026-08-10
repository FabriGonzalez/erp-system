package com.gonzalez.erp.modules.orders.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.service.OrderService;
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
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(
        name = "Orders",
        description = "Operaciones de órdenes de venta"
)
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Listar órdenes", description = "Obtiene todas las órdenes de venta. Opcionalmente filtrar por estado.")
    public ResponseEntity<List<OrderResponse>> findAll(
            @Parameter(description = "Filtrar por estado: DRAFT, CONFIRMED o CANCELLED. Si no se envía, retorna todas.")
            @RequestParam(required = false) OrderStatus status) {
        return ResponseEntity.ok(orderService.findAll(status));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener orden por ID", description = "Busca y retorna una orden de venta por su identificador.")
    @ApiResponse(responseCode = "404", description = "Orden no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> findById(
            @Parameter(description = "ID de la orden a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear orden", description = "Crea una orden en estado DRAFT con sus ítems. El precio unitario se toma del producto al momento de la creación. Los ítems no son editables posteriormente.")
    @ApiResponse(responseCode = "201", description = "Orden creada exitosamente")
    @ApiResponse(responseCode = "400", description = "Validación inválida (ítems duplicados)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Sucursal, cliente o producto no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> create(
            @Parameter(description = "Datos de la orden")
            @Valid @RequestBody OrderRequest request) {
        OrderResponse response = orderService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}/confirm")
    @Operation(summary = "Confirmar orden", description = "Confirma una orden en estado DRAFT, valida y descuenta el stock de la sucursal y crea los movimientos SALE asociados.")
    @ApiResponse(responseCode = "200", description = "Orden confirmada exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado inválido o stock insuficiente",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Orden o stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> confirm(
            @Parameter(description = "ID de la orden a confirmar")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirm(id));
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancelar orden", description = "Cancela una orden. Si la orden estaba confirmada, devuelve el stock y crea movimientos RETURN asociados. Una orden cancelada no puede reactivarse.")
    @ApiResponse(responseCode = "200", description = "Orden cancelada exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado inválido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Orden o stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> cancel(
            @Parameter(description = "ID de la orden a cancelar")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.cancel(id));
    }
}
