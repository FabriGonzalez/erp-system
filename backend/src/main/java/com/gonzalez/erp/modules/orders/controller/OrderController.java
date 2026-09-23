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
            @Parameter(description = "Filtrar por estado: DRAFT, CONFIRMED, TO_PREPARE, SHIPPED, CANCELLED o RETURNED. Si no se envía, retorna todas.")
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
    @Operation(summary = "Crear orden", description = "Crea una orden en estado DRAFT. El precio unitario se toma de la variante de producto al momento de la creación. QUICK_SALE requiere cliente registrado y no tiene ítems.")
    @ApiResponse(responseCode = "201", description = "Orden creada exitosamente")
    @ApiResponse(responseCode = "400", description = "Validación inválida (venta rápida, variantes duplicadas, etc.)",
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
    @Operation(summary = "Editar orden", description = "Edita una orden en DRAFT (sin tocar stock) o en TO_PREPARE (ajustando stock de forma atómica).")
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

    @PatchMapping("/{id}/confirm")
    @Operation(summary = "Confirmar orden", description = "Confirma una orden LOCAL_PICKUP en estado DRAFT, valida y descuenta el stock de la sucursal y crea los movimientos SALE asociados.")
    @ApiResponse(responseCode = "200", description = "Orden confirmada exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado o tipo de entrega inválido, o stock insuficiente",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Orden o stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> confirm(
            @Parameter(description = "ID de la orden a confirmar")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.confirm(id));
    }

    @PatchMapping("/{id}/prepare")
    @Operation(summary = "Preparar orden", description = "Prepara una orden SHIPPING en estado DRAFT: valida y descuenta el stock de la sucursal, crea los movimientos SALE asociados y pasa la orden a TO_PREPARE.")
    @ApiResponse(responseCode = "200", description = "Orden preparada exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado o tipo de entrega inválido, o stock insuficiente",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Orden o stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> prepare(
            @Parameter(description = "ID de la orden a preparar")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.prepare(id));
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
    @Operation(summary = "Cancelar orden", description = "Cancela una orden. Si estaba CONFIRMED o TO_PREPARE, devuelve el stock y crea movimientos RETURN asociados. SHIPPED y RETURNED no pueden cancelarse.")
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

    @PatchMapping("/{id}/return")
    @Operation(summary = "Devolver orden", description = "Devuelve una orden CONFIRMED o SHIPPED: devuelve el stock de todos los ítems, crea movimientos RETURN y la pasa a RETURNED. Devolución total.")
    @ApiResponse(responseCode = "200", description = "Orden devuelta exitosamente")
    @ApiResponse(responseCode = "400", description = "Estado inválido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Orden o stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> returnOrder(
            @Parameter(description = "ID de la orden a devolver")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.returnOrder(id));
    }
}