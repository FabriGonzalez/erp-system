package com.gonzalez.erp.modules.products.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeValueRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;
import com.gonzalez.erp.modules.products.service.ProductAttributeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/product-attributes")
@RequiredArgsConstructor
@Tag(name = "Product Attributes", description = "Operaciones CRUD para atributos configurables de productos")
public class ProductAttributeController {

    private final ProductAttributeService attributeService;

    @GetMapping
    @Operation(summary = "Listar atributos", description = "Obtiene todos los atributos de la empresa. Opcionalmente filtrar por estado.")
    public ResponseEntity<List<ProductAttributeResponse>> findAll(
            @Parameter(description = "Filtrar por estado: true (activos) o false (inactivos)")
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(attributeService.findAll(active));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener atributo por ID", description = "Busca y retorna un atributo por su ID.")
    public ResponseEntity<ProductAttributeResponse> findById(
            @Parameter(description = "ID del atributo")
            @PathVariable Long id) {
        return ResponseEntity.ok(attributeService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear atributo", description = "Crea un nuevo atributo con nombre único por empresa.")
    @ApiResponse(responseCode = "201", description = "Atributo creado exitosamente")
    @ApiResponse(responseCode = "409", description = "Ya existe un atributo con ese nombre",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ProductAttributeResponse> create(
            @Valid @RequestBody ProductAttributeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attributeService.create(request));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar atributo", description = "Actualiza el nombre de un atributo existente.")
    public ResponseEntity<ProductAttributeResponse> update(
            @Parameter(description = "ID del atributo")
            @PathVariable Long id,
            @Valid @RequestBody ProductAttributeRequest request) {
        return ResponseEntity.ok(attributeService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar atributo", description = "Desactiva lógicamente un atributo.")
    public ResponseEntity<ProductAttributeResponse> deactivate(
            @Parameter(description = "ID del atributo")
            @PathVariable Long id) {
        return ResponseEntity.ok(attributeService.deactivate(id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar atributo", description = "Reactiva un atributo previamente desactivado.")
    public ResponseEntity<ProductAttributeResponse> activate(
            @Parameter(description = "ID del atributo")
            @PathVariable Long id) {
        return ResponseEntity.ok(attributeService.activate(id));
    }

    @PostMapping("/{id}/values")
    @Operation(summary = "Agregar valor al atributo", description = "Agrega un valor a un atributo existente. El valor debe ser único dentro del atributo.")
    @ApiResponse(responseCode = "201", description = "Valor agregado exitosamente")
    @ApiResponse(responseCode = "409", description = "Ya existe un valor con ese texto para este atributo",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ProductAttributeValueResponse> addValue(
            @Parameter(description = "ID del atributo")
            @PathVariable Long id,
            @Valid @RequestBody ProductAttributeValueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attributeService.addValue(id, request));
    }

    @PatchMapping("/values/{valueId}")
    @Operation(summary = "Actualizar valor", description = "Actualiza el texto de un valor de atributo.")
    public ResponseEntity<ProductAttributeValueResponse> updateValue(
            @Parameter(description = "ID del valor")
            @PathVariable Long valueId,
            @Valid @RequestBody ProductAttributeValueRequest request) {
        return ResponseEntity.ok(attributeService.updateValue(valueId, request));
    }

    @PatchMapping("/values/{valueId}/deactivate")
    @Operation(summary = "Desactivar valor", description = "Desactiva lógicamente un valor de atributo.")
    public ResponseEntity<ProductAttributeValueResponse> deactivateValue(
            @Parameter(description = "ID del valor")
            @PathVariable Long valueId) {
        return ResponseEntity.ok(attributeService.deactivateValue(valueId));
    }

    @PatchMapping("/values/{valueId}/activate")
    @Operation(summary = "Activar valor", description = "Reactiva un valor de atributo previamente desactivado.")
    public ResponseEntity<ProductAttributeValueResponse> activateValue(
            @Parameter(description = "ID del valor")
            @PathVariable Long valueId) {
        return ResponseEntity.ok(attributeService.activateValue(valueId));
    }
}
