package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.store.dto.StoreAddressResponse;
import com.gonzalez.erp.modules.store.service.StoreAddressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/store/me/addresses")
@RequiredArgsConstructor
@Tag(name = "Store addresses", description = "Direcciones del comprador. Requiere Authorization: Bearer con el token de comprador.")
public class StoreAddressController {

    private final StoreAddressService addressService;

    @GetMapping
    @Operation(summary = "Mis direcciones", description = "Solo las activas, con la principal primero.")
    @ApiResponse(responseCode = "200", description = "Direcciones del comprador")
    public ResponseEntity<List<StoreAddressResponse>> list() {
        return ResponseEntity.ok(addressService.list());
    }

    @PostMapping
    @Operation(summary = "Agregar una dirección", description = "La primera queda como principal. Hasta 5 activas.")
    @ApiResponse(responseCode = "201", description = "Dirección creada")
    @ApiResponse(responseCode = "400", description = "Datos inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "Ya tiene 5 direcciones activas (ADDRESS_LIMIT_REACHED)",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreAddressResponse> create(@Valid @RequestBody AddressRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(addressService.create(request));
    }

    @PatchMapping("/{addressId}")
    @Operation(summary = "Editar una dirección",
            description = "Recibe la dirección completa. Con mainAddress=true pasa a ser la principal.")
    @ApiResponse(responseCode = "200", description = "Dirección actualizada")
    @ApiResponse(responseCode = "400", description = "Datos inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "No existe entre las direcciones activas del comprador",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<StoreAddressResponse> update(
            @PathVariable Long addressId, @Valid @RequestBody AddressRequest request) {
        return ResponseEntity.ok(addressService.update(addressId, request));
    }

    @DeleteMapping("/{addressId}")
    @Operation(summary = "Borrar una dirección", description = "Si era la principal, pasa a serlo la activa más antigua.")
    @ApiResponse(responseCode = "204", description = "Dirección borrada")
    @ApiResponse(responseCode = "404", description = "No existe entre las direcciones activas del comprador",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> delete(@PathVariable Long addressId) {
        addressService.delete(addressId);
        return ResponseEntity.noContent().build();
    }
}
