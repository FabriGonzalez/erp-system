package com.gonzalez.erp.modules.roles.controller;

import com.gonzalez.erp.modules.roles.dto.request.RoleRequest;
import com.gonzalez.erp.modules.roles.dto.response.RoleResponse;
import com.gonzalez.erp.modules.roles.service.RoleService;
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
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Roles", description = "Operaciones CRUD para gestión de roles")
public class RoleController {

    private final RoleService roleService;

    @GetMapping
    @Operation(summary = "Obtener todos los roles", description = "Retorna lista de roles, opcionalmente filtrados por estado activo")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de roles obtenida exitosamente")
    })
    public ResponseEntity<List<RoleResponse>> findAll(
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(roleService.findAll(active));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener rol por ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rol encontrado"),
            @ApiResponse(responseCode = "404", description = "Rol no encontrado")
    })
    public ResponseEntity<RoleResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(roleService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear nuevo rol")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Rol creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "409", description = "El nombre del rol ya existe")
    })
    public ResponseEntity<RoleResponse> create(@Valid @RequestBody RoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar rol existente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rol actualizado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Rol no encontrado"),
            @ApiResponse(responseCode = "409", description = "El nombre del rol ya existe")
    })
    public ResponseEntity<RoleResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody RoleRequest request) {
        return ResponseEntity.ok(roleService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar rol")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rol desactivado"),
            @ApiResponse(responseCode = "404", description = "Rol no encontrado")
    })
    public ResponseEntity<RoleResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(roleService.deactivate(id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar rol")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Rol activado"),
            @ApiResponse(responseCode = "404", description = "Rol no encontrado")
    })
    public ResponseEntity<RoleResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(roleService.activate(id));
    }
}
