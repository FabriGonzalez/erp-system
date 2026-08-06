package com.gonzalez.erp.modules.customers.controller;

import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.customers.dto.response.AddressResponse;
import com.gonzalez.erp.modules.customers.service.AddressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/customers/{customerId}/addresses")
@RequiredArgsConstructor
@Tag(name = "Customer Addresses", description = "Operaciones CRUD para gestión de direcciones de clientes")
public class CustomerAddressController {

    private final AddressService addressService;

    @GetMapping
    @Operation(summary = "Obtener direcciones de un cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Direcciones obtenidas exitosamente"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado")
    })
    public ResponseEntity<List<AddressResponse>> findAll(@PathVariable Long customerId) {
        return ResponseEntity.ok(addressService.findByCustomerId(customerId));
    }

    @GetMapping("/{addressId}")
    @Operation(summary = "Obtener dirección por ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dirección encontrada"),
            @ApiResponse(responseCode = "404", description = "Dirección o cliente no encontrado")
    })
    public ResponseEntity<AddressResponse> findById(
            @PathVariable Long customerId,
            @PathVariable Long addressId) {
        return ResponseEntity.ok(addressService.findById(customerId, addressId));
    }

    @PostMapping
    @Operation(summary = "Crear nueva dirección para un cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Dirección creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado")
    })
    public ResponseEntity<AddressResponse> create(
            @PathVariable Long customerId,
            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(addressService.create(customerId, request));
    }

    @PatchMapping("/{addressId}")
    @Operation(summary = "Actualizar dirección existente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dirección actualizada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Dirección o cliente no encontrado")
    })
    public ResponseEntity<AddressResponse> update(
            @PathVariable Long customerId,
            @PathVariable Long addressId,
            @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.update(customerId, addressId, request));
    }

    @PatchMapping("/{addressId}/deactivate")
    @Operation(summary = "Desactivar dirección")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dirección desactivada"),
            @ApiResponse(responseCode = "404", description = "Dirección o cliente no encontrado")
    })
    public ResponseEntity<AddressResponse> deactivate(
            @PathVariable Long customerId,
            @PathVariable Long addressId) {
        return ResponseEntity.ok(addressService.deactivate(customerId, addressId));
    }

    @PatchMapping("/{addressId}/activate")
    @Operation(summary = "Activar dirección")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Dirección activada"),
            @ApiResponse(responseCode = "404", description = "Dirección o cliente no encontrado")
    })
    public ResponseEntity<AddressResponse> activate(
            @PathVariable Long customerId,
            @PathVariable Long addressId) {
        return ResponseEntity.ok(addressService.activate(customerId, addressId));
    }
}
