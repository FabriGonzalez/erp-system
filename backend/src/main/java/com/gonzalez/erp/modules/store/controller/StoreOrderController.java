package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.store.dto.StoreCheckoutErrorResponse;
import com.gonzalez.erp.modules.store.dto.StoreOrderResponse;
import com.gonzalez.erp.modules.store.dto.StoreOrderSummaryResponse;
import com.gonzalez.erp.modules.store.service.StoreOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/store/me/orders")
@RequiredArgsConstructor
@Tag(name = "Store orders", description = "Mis pedidos del comprador logueado. Requiere Authorization: Bearer con el token de comprador.")
@ApiResponse(responseCode = "404", description = "El pedido no existe, es de otro comprador o es una venta del local",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
public class StoreOrderController {

    private static final int MAX_PAGE_SIZE = 50;

    private final StoreOrderService orderService;

    @GetMapping
    @Operation(summary = "Mis pedidos", description = "Pedidos hechos en la tienda, los más nuevos primero. "
            + "No incluye las ventas que el local le cargue a la misma ficha.")
    @ApiResponse(responseCode = "400", description = "Página o tamaño inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PageResponse<StoreOrderSummaryResponse>> findMine(
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "10") int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidOrderException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
        return ResponseEntity.ok(orderService.findMine(page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalle de un pedido", description = "Con los precios cobrados y la dirección como quedó al comprar.")
    public ResponseEntity<StoreOrderResponse> findOne(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findMine(id));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancelar un pedido sin pagar",
            description = "Solo mientras espera el pago. Devuelve el stock reservado. Un pedido pagado no se cancela desde la tienda.")
    @ApiResponse(responseCode = "409", description = "ORDER_NOT_CANCELLABLE: ya está pagado o cancelado",
            content = @Content(schema = @Schema(implementation = StoreCheckoutErrorResponse.class)))
    public ResponseEntity<StoreOrderResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.cancelMine(id));
    }
}
