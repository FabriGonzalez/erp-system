package com.gonzalez.erp.modules.customers.controller;

import com.gonzalez.erp.modules.customers.dto.request.CustomerRequest;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import com.gonzalez.erp.modules.customers.service.CustomerService;
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
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Operaciones CRUD para gestión de clientes")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @Operation(summary = "Obtener todos los clientes", description = "Retorna lista de clientes, opcionalmente filtrados por estado activo y texto de búsqueda")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de clientes obtenida exitosamente")
    })
    public ResponseEntity<List<CustomerResponse>> findAll(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(customerService.findAll(active, q));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener cliente por ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cliente encontrado"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado")
    })
    public ResponseEntity<CustomerResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear nuevo cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Cliente creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "409", description = "El documento del cliente ya existe")
    })
    public ResponseEntity<CustomerResponse> create(@Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.create(request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar cliente existente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cliente actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado"),
            @ApiResponse(responseCode = "409", description = "El documento del cliente ya existe")
    })
    public ResponseEntity<CustomerResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody CustomerRequest request) {
        return ResponseEntity.ok(customerService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cliente desactivado"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado")
    })
    public ResponseEntity<CustomerResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.deactivate(id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cliente activado"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado")
    })
    public ResponseEntity<CustomerResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.activate(id));
    }

}
