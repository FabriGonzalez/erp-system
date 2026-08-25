package com.gonzalez.erp.modules.provisioning.controller;

import com.gonzalez.erp.modules.provisioning.dto.request.ProvisionCompanyRequest;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/provisioning")
@RequiredArgsConstructor
@Tag(name = "Provisioning", description = "Provisioning de empresas")
public class ProvisioningController {

    private final ProvisioningService provisioningService;

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
}
