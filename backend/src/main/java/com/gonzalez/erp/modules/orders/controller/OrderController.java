package com.gonzalez.erp.modules.orders.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
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
    @Operation(summary = "Listar órdenes", description = "Obtiene las órdenes de venta de la empresa y sucursales del usuario. Opcionalmente filtrar por estado, sucursal, tipo de venta o tipo de entrega.")
    public ResponseEntity<List<OrderResponse>> findAll(
            @Parameter(description = "Filtrar por estado: CONFIRMED, TO_PREPARE, SHIPPED o CANCELLED. Si no se envía, retorna todas.")
            @RequestParam(required = false) OrderStatus status,
            @Parameter(description = "Filtrar por sucursal")
            @RequestParam(required = false) Long branchId,
            @Parameter(description = "Filtrar por tipo de venta: WITH_PRODUCTS o QUICK_SALE")
            @RequestParam(required = false) SalesType salesType,
            @Parameter(description = "Filtrar por tipo de entrega: LOCAL_PICKUP o SHIPPING")
            @RequestParam(required = false) DeliveryType deliveryType) {
        return ResponseEntity.ok(orderService.findAll(status, branchId, salesType, deliveryType));
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
    @Operation(summary = "Crear orden", description = "Crea una orden en estado CONFIRMED (LOCAL_PICKUP) o TO_PREPARE (SHIPPING) aplicando el descuento de stock atómicamente si es WITH_PRODUCTS. QUICK_SALE requiere cliente registrado y no tiene ítems.")
    @ApiResponse(responseCode = "201", description = "Orden creada exitosamente")
    @ApiResponse(responseCode = "400", description = "Validación inválida (venta rápida, variantes duplicadas, stock insuficiente, etc.)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Sucursal, cliente o variante de producto no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> create(
            @Parameter(description = "Datos de la orden")
            @Valid @RequestBody OrderRequest request) {
        OrderResponse response = orderService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Editar orden", description = "Edita una orden en TO_PREPARE (ajustando stock de forma atómica).")
    @ApiResponse(responseCode = "200", description = "Orden editada exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado no editable o stock insuficiente",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> update(
            @Parameter(description = "ID de la orden a editar")
            @PathVariable Long id,
            @Parameter(description = "Datos de la orden")
            @Valid @RequestBody OrderUpdateRequest request) {
        return ResponseEntity.ok(orderService.update(id, request));
    }

    @PatchMapping("/{id}/ship")
    @Operation(summary = "Enviar orden", description = "Envía una orden SHIPPING en TO_PREPARE, pasándola a SHIPPED. No modifica stock.")
    @ApiResponse(responseCode = "200", description = "Orden enviada exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado o tipo de entrega inválido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Orden no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> ship(
            @Parameter(description = "ID de la orden a enviar")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.ship(id));
    }

    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancelar orden", description = "Cancela una orden CONFIRMED o TO_PREPARE, devuelve el stock de forma atómica y crea movimientos RETURN asociados. SHIPPED no puede cancelarse.")
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