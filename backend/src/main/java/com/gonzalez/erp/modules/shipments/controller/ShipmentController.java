package com.gonzalez.erp.modules.shipments.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.shipments.dto.request.ShipmentRequest;
import com.gonzalez.erp.modules.shipments.dto.response.ShipmentResponse;
import com.gonzalez.erp.modules.shipments.service.ShipmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders/{orderId}/shipment")
@RequiredArgsConstructor
@Tag(name = "Order Shipments", description = "Operaciones de envíos asociados a órdenes de venta")
public class ShipmentController {

    private final ShipmentService shipmentService;

    @PostMapping
    @Operation(summary = "Crear shipment para una orden", description = "Crea un envío asociado a la orden. La dirección es un snapshot de los datos recibidos, independiente de las direcciones del cliente. Una orden solo puede tener un envío.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Shipment creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Orden no encontrada",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "La orden ya tiene un shipment",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ShipmentResponse> create(
            @PathVariable Long orderId,
            @Valid @RequestBody ShipmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shipmentService.create(orderId, request));
    }

    @GetMapping
    @Operation(summary = "Obtener shipment de una orden", description = "Busca y retorna el envío asociado a la orden.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Shipment encontrado"),
            @ApiResponse(responseCode = "404", description = "Orden o shipment no encontrado",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<ShipmentResponse> findByOrderId(@PathVariable Long orderId) {
        return ResponseEntity.ok(shipmentService.findByOrderId(orderId));
    }

    @PatchMapping
    @Operation(
            summary = "Actualizar envío de una orden",
            description = "Actualiza la dirección de envío mientras la orden se encuentra en estado DRAFT"
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Envío actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "La orden no está en estado DRAFT"),
            @ApiResponse(responseCode = "404", description = "Orden o envío no encontrado")
    })
    public ResponseEntity<ShipmentResponse> update(
            @PathVariable Long orderId,
            @Valid @RequestBody ShipmentRequest request) {

        return ResponseEntity.ok(
                shipmentService.update(orderId, request)
        );
    }
}
