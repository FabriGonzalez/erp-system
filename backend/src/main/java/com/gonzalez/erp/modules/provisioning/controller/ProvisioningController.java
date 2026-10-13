package com.gonzalez.erp.modules.provisioning.controller;

import com.gonzalez.erp.modules.provisioning.dto.request.ChangeCompanyStatusRequest;
import com.gonzalez.erp.modules.provisioning.dto.request.ProvisionCompanyRequest;
import com.gonzalez.erp.modules.provisioning.dto.response.CompanyResponse;
import com.gonzalez.erp.modules.provisioning.dto.response.ProvisionCompanyResponse;
import com.gonzalez.erp.modules.provisioning.service.ProvisioningService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/provisioning")
@RequiredArgsConstructor
@Tag(name = "Provisioning", description = "Provisioning de empresas")
public class ProvisioningController {

    private final ProvisioningService provisioningService;

    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @GetMapping("/companies")
    @Operation(summary = "Listar empresas", description = "Todas las empresas con su estado. Solo PLATFORM_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Lista de empresas"),
            @ApiResponse(responseCode = "403", description = "No es PLATFORM_ADMIN")
    })
    public ResponseEntity<List<CompanyResponse>> findAllCompanies() {
        return ResponseEntity.ok(provisioningService.findAllCompanies());
    }

    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @PostMapping("/companies")
    @Operation(summary = "Provisionar nueva empresa",
               description = "Crea una Company con su primer usuario ADMIN. Solo PLATFORM_ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Empresa provisionada exitosamente"),
            @ApiResponse(responseCode = "403", description = "No es PLATFORM_ADMIN"),
            @ApiResponse(responseCode = "409", description = "Nombre de company, username o email ya existe"),
            @ApiResponse(responseCode = "422", description = "Error de validacion")
    })
    public ResponseEntity<ProvisionCompanyResponse> provisionCompany(
            @Valid @RequestBody ProvisionCompanyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(provisioningService.provisionCompany(request));
    }

    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @PatchMapping("/companies/{id}/status")
    @Operation(summary = "Cambiar estado de una empresa",
               description = "ACTIVE, SUSPENDED o CANCELLED. Suspender o cancelar requiere motivo y corta "
                       + "el acceso de sus usuarios de inmediato. CANCELLED es definitivo.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Estado actualizado"),
            @ApiResponse(responseCode = "400", description = "Falta el motivo o el estado es inválido"),
            @ApiResponse(responseCode = "403", description = "No es PLATFORM_ADMIN"),
            @ApiResponse(responseCode = "404", description = "Empresa no encontrada"),
            @ApiResponse(responseCode = "409", description = "Transición de estado no permitida")
    })
    public ResponseEntity<CompanyResponse> changeCompanyStatus(
            @PathVariable Long id,
            @Valid @RequestBody ChangeCompanyStatusRequest request) {
        return ResponseEntity.ok(provisioningService.changeCompanyStatus(id, request));
    }
}
