package com.gonzalez.erp.modules.companies.controller;

import com.gonzalez.erp.modules.companies.dto.request.StoreSettingsRequest;
import com.gonzalez.erp.modules.companies.dto.response.StoreSettingsResponse;
import com.gonzalez.erp.modules.companies.service.CompanyStoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/companies/me/store")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMINISTRAR_TIENDA')")
@Tag(name = "Store settings", description = "Configuración de la tienda web de la empresa")
public class CompanyStoreController {

    private final CompanyStoreService companyStoreService;

    @GetMapping
    @Operation(summary = "Ver configuración de la tienda",
            description = "Dominio y habilitación (solo lectura, los carga el operador), ajuste de precio y redondeo.")
    public ResponseEntity<StoreSettingsResponse> getSettings() {
        return ResponseEntity.ok(companyStoreService.getSettings());
    }

    @PatchMapping
    @Operation(summary = "Cambiar el precio web",
            description = "Ajuste porcentual sobre el precio del ERP (-90 a 500) y múltiplo al que se redondea hacia arriba (1 a 1000).")
    public ResponseEntity<StoreSettingsResponse> updateSettings(@Valid @RequestBody StoreSettingsRequest request) {
        return ResponseEntity.ok(companyStoreService.updateSettings(request));
    }
}
