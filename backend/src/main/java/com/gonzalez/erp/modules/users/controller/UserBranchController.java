package com.gonzalez.erp.modules.users.controller;

import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;
import com.gonzalez.erp.modules.users.service.UserBranchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users/{userId}/branches")
@RequiredArgsConstructor
@Tag(name = "User Branches", description = "Asignación de sucursales a usuarios")
public class UserBranchController {

    private final UserBranchService userBranchService;

    @GetMapping
    @Operation(summary = "Obtener sucursales del usuario")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Sucursales obtenidas exitosamente"),
            @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<List<BranchResponse>> findBranchesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(userBranchService.findBranchesByUserId(userId));
    }

    @PostMapping("/{branchId}")
    @Operation(summary = "Asignar usuario a sucursal")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Usuario asignado exitosamente"),
            @ApiResponse(responseCode = "404", description = "Usuario o sucursal no encontrados")
    })
    public ResponseEntity<Void> assignBranch(@PathVariable Long userId, @PathVariable Long branchId) {
        userBranchService.assignUserToBranch(userId, branchId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{branchId}")
    @Operation(summary = "Remover usuario de sucursal")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Usuario removido exitosamente"),
            @ApiResponse(responseCode = "404", description = "Usuario no asignado a esa sucursal")
    })
    public ResponseEntity<Void> removeBranch(@PathVariable Long userId, @PathVariable Long branchId) {
        userBranchService.removeUserFromBranch(userId, branchId);
        return ResponseEntity.noContent().build();
    }
}
