package com.gonzalez.erp.modules.products.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.service.ProductService;
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
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Operaciones CRUD para gestión de productos")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Listar productos", description = "Obtiene todos los productos. Opcionalmente filtrar por estado activo/inactivo.")
    public ResponseEntity<List<ProductResponse>> findAll(
            @Parameter(description = "Filtrar por estado: true (activos) o false (inactivos). Si no se envía, retorna todos.")
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(productService.findAll(active));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener producto por ID", description = "Busca y retorna un producto por su ID.")
    public ResponseEntity<ProductResponse> findById(
            @Parameter(description = "ID del producto a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(productService.findById(id));
    }

    @PostMapping
    @Operation(summary = "Crear producto", description = "Crea un nuevo producto con variantes y, opcionalmente, stock inicial por sucursal. Cada variante debe tener un SKU único por empresa y al menos un valor de atributo.")
    @ApiResponse(responseCode = "201", description = "Producto creado exitosamente")
    @ApiResponse(responseCode = "404", description = "Categoría, atributo o valor de atributo no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "SKU duplicado en variantes o la categoría está desactivada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody ProductRequest request) {
        ProductResponse response = productService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar producto", description = "Actualiza el nombre, descripción, categoría y variantes de un producto existente.")
    @ApiResponse(responseCode = "200", description = "Producto actualizado exitosamente")
    @ApiResponse(responseCode = "404", description = "Producto, categoría, atributo o valor de atributo no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "409", description = "SKU duplicado en variantes o la categoría está desactivada",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ProductResponse> update(
            @Parameter(description = "ID del producto a actualizar")
            @PathVariable Long id,
            @Valid @RequestBody ProductUpdateRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar producto", description = "Desactiva lógicamente un producto (soft delete).")
    @ApiResponse(responseCode = "200", description = "Producto desactivado exitosamente")
    @ApiResponse(responseCode = "404", description = "Producto no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ProductResponse> deactivate(
            @Parameter(description = "ID del producto a desactivar")
            @PathVariable Long id) {
        return ResponseEntity.ok(productService.deactivate(id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar producto", description = "Reactiva un producto previamente desactivado.")
    @ApiResponse(responseCode = "200", description = "Producto activado exitosamente")
    @ApiResponse(responseCode = "404", description = "Producto no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ProductResponse> activate(
            @Parameter(description = "ID del producto a activar")
            @PathVariable Long id) {
        return ResponseEntity.ok(productService.activate(id));
    }
}
