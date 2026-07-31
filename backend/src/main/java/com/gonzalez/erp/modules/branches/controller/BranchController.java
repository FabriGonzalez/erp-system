package com.gonzalez.erp.modules.branches.controller;

import com.gonzalez.erp.modules.branches.dto.request.BranchRequest;
import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;
import com.gonzalez.erp.modules.branches.service.BranchService;
import com.gonzalez.erp.modules.users.dto.response.UserResponse;
import com.gonzalez.erp.modules.users.service.UserBranchService;
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
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
@Tag(name = "Branches", description = "Operaciones CRUD para gestión de sucursales")
public class BranchController {

    private final BranchService branchService;
    private final UserBranchService userBranchService;

    @GetMapping
    @Operation(summary = "Obtener todas las sucursales", description = "Retorna lista de sucursales, opcionalmente filtradas por estado activo")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de sucursales obtenida exitosamente")
    })
    public ResponseEntity<List<BranchResponse>> findAll(
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(branchService.findAll(active));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener sucursal por ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sucursal encontrada"),
            @ApiResponse(responseCode = "404", description = "Sucursal no encontrada")
    })
    public ResponseEntity<BranchResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear nueva sucursal")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Sucursal creada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "409", description = "El nombre de la sucursal ya existe")
    })
    public ResponseEntity<BranchResponse> create(@Valid @RequestBody BranchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(branchService.create(request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar sucursal existente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sucursal actualizada exitosamente"),
            @ApiResponse(responseCode = "404", description = "Sucursal no encontrada"),
            @ApiResponse(responseCode = "409", description = "El nombre de la sucursal ya existe")
    })
    public ResponseEntity<BranchResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody BranchRequest request) {
        return ResponseEntity.ok(branchService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar sucursal")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sucursal desactivada"),
            @ApiResponse(responseCode = "404", description = "Sucursal no encontrada")
    })
    public ResponseEntity<BranchResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.deactivate(id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar sucursal")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sucursal activada"),
            @ApiResponse(responseCode = "404", description = "Sucursal no encontrada")
    })
    public ResponseEntity<BranchResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(branchService.activate(id));
    }

    @GetMapping("/{branchId}/users")
    @Operation(summary = "Obtener usuarios de una sucursal")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuarios obtenidos exitosamente"),
            @ApiResponse(responseCode = "404", description = "Sucursal no encontrada")
    })
    public ResponseEntity<List<UserResponse>> findUsersByBranch(@PathVariable Long branchId) {
        return ResponseEntity.ok(userBranchService.findUsersByBranchId(branchId));
    }
}
