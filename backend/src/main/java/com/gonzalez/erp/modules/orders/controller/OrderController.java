package com.gonzalez.erp.modules.orders.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.orders.dto.request.OrderCancelRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderRequest;
import com.gonzalez.erp.modules.orders.dto.request.OrderUpdateRequest;
import com.gonzalez.erp.modules.orders.dto.response.OrderResponse;
import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.PaymentStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.orders.service.OrderService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
@Tag(
        name = "Orders",
        description = "Operaciones de órdenes de venta"
)
public class OrderController {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> SORTABLE_FIELDS = Set.of("createdAt", "total", "orderNumber");

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Listar órdenes", description = "Obtiene de forma paginada las órdenes de venta de la empresa y sucursales del usuario. Permite filtrar por estado, sucursal, tipo de venta o tipo de entrega, y buscar por número de orden o nombre de cliente.")
    @ApiResponse(responseCode = "400", description = "Parámetros de paginación u orden inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PageResponse<OrderResponse>> findAll(
            @Parameter(description = "Filtrar por estado: CONFIRMED, TO_PREPARE, SHIPPED o CANCELLED. Si no se envía, retorna todas.")
            @RequestParam(required = false) OrderStatus status,
            @Parameter(description = "Filtrar por sucursal")
            @RequestParam(required = false) Long branchId,
            @Parameter(description = "Filtrar por tipo de venta: WITH_PRODUCTS o QUICK_SALE")
            @RequestParam(required = false) SalesType salesType,
            @Parameter(description = "Filtrar por tipo de entrega: LOCAL_PICKUP o SHIPPING")
            @RequestParam(required = false) DeliveryType deliveryType,
            @Parameter(description = "Filtrar por cliente")
            @RequestParam(required = false) Long customerId,
            @Parameter(description = "Filtrar por estado de pago: PENDING, PARTIAL o PAID. Las ventas sin cliente cuentan como PAID.")
            @RequestParam(required = false) PaymentStatus paymentStatus,
            @Parameter(description = "Búsqueda por número de orden o nombre de cliente")
            @RequestParam(required = false) String q,
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Orden en formato campo,dirección. Campos: createdAt, total, orderNumber. Dirección: asc o desc.")
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        if (page < 0) {
            throw new InvalidOrderException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidOrderException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        return ResponseEntity.ok(orderService.findAll(
                status, branchId, salesType, deliveryType, customerId, paymentStatus, q, pageable));
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
    @Operation(summary = "Crear orden", description = "Crea una orden en estado CONFIRMED (LOCAL_PICKUP) o TO_PREPARE (SHIPPING) aplicando el descuento de stock atómicamente si es WITH_PRODUCTS. QUICK_SALE requiere cliente registrado y no tiene ítems. Con cliente: applyCredit aplica su saldo a favor y initialPayment registra un pago; ambos se asignan a esta orden. Sin cliente, la orden se considera pagada al crearse.")
    @ApiResponse(responseCode = "201", description = "Orden creada exitosamente")
    @ApiResponse(responseCode = "400", description = "Validación inválida (venta rápida, variantes duplicadas, etc.)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "El usuario no está asignado a la sucursal",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "Sucursal, cliente o variante de producto no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Stock insuficiente",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> create(
            @Parameter(description = "Datos de la orden")
            @Valid @RequestBody OrderRequest request) {
        OrderResponse response = orderService.create(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(response.id())
                .toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Editar orden", description = "Edita los ítems (WITH_PRODUCTS) o el monto (QUICK_SALE) de una orden en TO_PREPARE, ajustando stock de forma atómica.")
    @ApiResponse(responseCode = "200", description = "Orden editada exitosamente")
    @ApiResponse(responseCode = "400", description = "Datos inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Estado no editable o stock insuficiente",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> update(
            @Parameter(description = "ID de la orden a editar")
            @PathVariable Long id,
            @Parameter(description = "Datos a modificar de la orden")
            @Valid @RequestBody OrderUpdateRequest request) {
        return ResponseEntity.ok(orderService.update(id, request));
    }

    @PostMapping("/{id}/dispatch")
    @Operation(summary = "Despachar orden", description = "Despacha una orden SHIPPING en TO_PREPARE, pasándola a SHIPPED. No modifica stock.")
    @ApiResponse(responseCode = "200", description = "Orden despachada exitosamente")
    @ApiResponse(responseCode = "404", description = "Orden no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Estado o tipo de entrega inválido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> dispatch(
            @Parameter(description = "ID de la orden a despachar")
            @PathVariable Long id) {
        return ResponseEntity.ok(orderService.dispatch(id));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancelar orden", description = "Cancela una orden CONFIRMED o TO_PREPARE, revierte stock y movimientos contables, permitiendo optar por crédito o reembolso.")
    @ApiResponse(responseCode = "200", description = "Orden cancelada exitosamente")
    @ApiResponse(responseCode = "404", description = "Orden o stock no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Estado inválido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<OrderResponse> cancel(
            @Parameter(description = "ID de la orden a cancelar")
            @PathVariable Long id,
            @RequestBody(required = false) OrderCancelRequest request) {
        return ResponseEntity.ok(orderService.cancel(id, request));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        if (parts.length > 2 || !SORTABLE_FIELDS.contains(field)) {
            throw new InvalidOrderException("sort field must be one of: " + SORTABLE_FIELDS);
        }
        String direction = parts.length == 2 ? parts[1].trim().toLowerCase() : "asc";
        if (!direction.equals("asc") && !direction.equals("desc")) {
            throw new InvalidOrderException("sort direction must be asc or desc");
        }
        Sort.Direction dir = direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(dir, field).and(Sort.by(dir, "id"));
    }
}
