package com.gonzalez.erp.modules.users.controller;

import com.gonzalez.erp.modules.users.dto.request.UserRequest;
import com.gonzalez.erp.modules.users.dto.request.UserUpdateRequest;
import com.gonzalez.erp.modules.users.dto.response.UserResponse;
import com.gonzalez.erp.modules.users.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@PreAuthorize("hasAuthority('ADMINISTRAR_USUARIOS')")
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Operaciones CRUD para gestión de usuarios")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Obtener todos los usuarios", description = "Retorna lista de usuarios, opcionalmente filtrados por estado activo")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de usuarios obtenida exitosamente")
    })
    public ResponseEntity<List<UserResponse>> findAll(
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(userService.findAll(active));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener usuario por ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario encontrado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<UserResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear nuevo usuario")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Usuario creado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "409", description = "El email o username ya existe")
    })
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar usuario existente")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario actualizado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
            @ApiResponse(responseCode = "409", description = "El email o username ya existe")
    })
    public ResponseEntity<UserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar usuario")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario desactivado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<UserResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(userService.deactivate(id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar usuario")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Usuario activado"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<UserResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(userService.activate(id));
    }
}
