package com.gonzalez.erp.modules.categories.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.categories.dto.request.CategoryRequest;
import com.gonzalez.erp.modules.categories.dto.response.CategoryResponse;
import com.gonzalez.erp.modules.categories.service.CategoryService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Operaciones CRUD para gestión de categorías")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Listar categorías", description = "Obtiene todas las categorías. Opcionalmente filtrar por estado activo/inactivo.")
    public ResponseEntity<List<CategoryResponse>> findAll(
            @Parameter(description = "Filtrar por estado: true (activas) o false (inactivas). Si no se envía, retorna todas.")
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(categoryService.findAll(active));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener categoría por ID", description = "Busca y retorna una categoría por su identificador.")
    public ResponseEntity<CategoryResponse> findById(
            @Parameter(description = "ID de la categoría a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(categoryService.findById(id));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_CATEGORIAS')")
    @PostMapping
    @Operation(summary = "Crear categoría", description = "Crea una nueva categoría con nombre y descripción opcional.")
    @ApiResponse(responseCode = "201", description = "Categoría creada exitosamente")
    @ApiResponse(responseCode = "409", description = "Ya existe una categoría con ese nombre",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse response = categoryService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_CATEGORIAS')")
    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar categoría", description = "Actualiza el nombre y/o descripción de una categoría existente.")
    @ApiResponse(responseCode = "200", description = "Categoría actualizada exitosamente")
    @ApiResponse(responseCode = "404", description = "Categoría no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<CategoryResponse> update(
            @Parameter(description = "ID de la categoría a actualizar")
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.ok(categoryService.update(id, request));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_CATEGORIAS')")
    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar categoría", description = "Desactiva lógicamente una categoría (soft delete).")
    @ApiResponse(responseCode = "200", description = "Categoría desactivada exitosamente")
    @ApiResponse(responseCode = "404", description = "Categoría no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<CategoryResponse> deactivate(
            @Parameter(description = "ID de la categoría a desactivar")
            @PathVariable Long id) {
        return ResponseEntity.ok(categoryService.deactivate(id));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_CATEGORIAS')")
    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar categoría", description = "Reactiva una categoría previamente desactivada.")
    @ApiResponse(responseCode = "200", description = "Categoría activada exitosamente")
    @ApiResponse(responseCode = "404", description = "Categoría no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<CategoryResponse> activate(
            @Parameter(description = "ID de la categoría a activar")
            @PathVariable Long id) {
        return ResponseEntity.ok(categoryService.activate(id));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_CATEGORIAS')")
    @PostMapping("/{id}/attributes/{attributeId}")
    @Operation(summary = "Asignar atributo a categoría", description = "Permite que las variantes de los productos de la categoría usen el atributo. Si ya lo tenía, no cambia nada.")
    @ApiResponse(responseCode = "204", description = "Atributo asignado")
    @ApiResponse(responseCode = "404", description = "Categoría o atributo no encontrados",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> addAttribute(@PathVariable Long id, @PathVariable Long attributeId) {
        categoryService.addAttributes(id, List.of(attributeId));
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_CATEGORIAS')")
    @DeleteMapping("/{id}/attributes/{attributeId}")
    @Operation(summary = "Quitar atributo de categoría", description = "Si la categoría no lo tenía, no cambia nada.")
    @ApiResponse(responseCode = "204", description = "Atributo quitado")
    @ApiResponse(responseCode = "404", description = "Categoría no encontrada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<Void> removeAttribute(@PathVariable Long id, @PathVariable Long attributeId) {
        categoryService.removeAttribute(id, attributeId);
        return ResponseEntity.noContent().build();
    }
}
