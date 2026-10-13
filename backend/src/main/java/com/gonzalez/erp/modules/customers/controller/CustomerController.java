package com.gonzalez.erp.modules.customers.controller;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.customers.dto.request.CustomerRequest;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import com.gonzalez.erp.modules.customers.exception.InvalidCustomerRequestException;
import com.gonzalez.erp.modules.customers.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customers", description = "Operaciones CRUD para gestión de clientes")
public class CustomerController {

    private static final int MAX_PAGE_SIZE = 100;

    private final CustomerService customerService;

    @GetMapping
    @Operation(summary = "Listar clientes",
               description = "Paginado. q busca por nombre, apellido, nombre completo, teléfono, email o documento. "
                       + "sort: name (apellido y nombre) o createdAt, con ,asc o ,desc. "
                       + "Cada cliente incluye la cantidad de direcciones activas y la principal.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Página de clientes"),
            @ApiResponse(responseCode = "400", description = "Parámetros de paginación u orden inválidos")
    })
    public ResponseEntity<PageResponse<CustomerResponse>> findAll(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidCustomerRequestException(
                    "page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        return ResponseEntity.ok(customerService.findAll(active, q, pageable));
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

    @PreAuthorize("hasAnyAuthority('ADMINISTRAR_CLIENTES','CREAR_PEDIDOS')")
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

    @PreAuthorize("hasAuthority('ADMINISTRAR_CLIENTES')")
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

    @PreAuthorize("hasAuthority('ADMINISTRAR_CLIENTES')")
    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cliente desactivado"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado")
    })
    public ResponseEntity<CustomerResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.deactivate(id));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_CLIENTES')")
    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar cliente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Cliente activado"),
            @ApiResponse(responseCode = "404", description = "Cliente no encontrado")
    })
    public ResponseEntity<CustomerResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.activate(id));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        String direction = parts.length == 2 ? parts[1].trim().toLowerCase() : "asc";
        if (parts.length > 2 || (!direction.equals("asc") && !direction.equals("desc"))) {
            throw new InvalidCustomerRequestException("sort must be <field>[,asc|desc]");
        }
        Sort.Direction dir = direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        // El id desempata para que la paginación sea estable.
        return switch (field) {
            case "name" -> Sort.by(dir, "lastName", "firstName").and(Sort.by(dir, "id"));
            case "createdAt" -> Sort.by(dir, "createdAt").and(Sort.by(dir, "id"));
            default -> throw new InvalidCustomerRequestException("sort field must be one of: name, createdAt");
        };
    }
}
