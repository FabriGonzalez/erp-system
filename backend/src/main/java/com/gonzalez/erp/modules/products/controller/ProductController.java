package com.gonzalez.erp.modules.products.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductSearchCriteria;
import com.gonzalez.erp.modules.products.dto.request.ProductStockFilter;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.exception.InvalidProductQueryException;
import com.gonzalez.erp.modules.products.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Operaciones CRUD para gestión de productos")
public class ProductController {

    private static final int MAX_PAGE_SIZE = 100;

    private final ProductService productService;

    @GetMapping
    @Operation(summary = "Listar productos",
               description = "Paginado. q busca por nombre o SKU de alguna variante, sin distinguir mayúsculas ni tildes. "
                       + "stock filtra por la suma de las variantes en branchId o, sin branchId, en toda la empresa. "
                       + "sort: name o createdAt, con ,asc o ,desc. Cada variante trae su stock por sucursal.")
    @ApiResponse(responseCode = "400", description = "Parámetros de paginación u orden inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PageResponse<ProductResponse>> findAll(
            @Parameter(description = "true (activos) o false (inactivos). Si no se envía, todos.")
            @RequestParam(required = false) Boolean active,
            @Parameter(description = "ID de la categoría")
            @RequestParam(required = false) Long categoryId,
            @Parameter(description = "Texto a buscar en el nombre o el SKU")
            @RequestParam(required = false) String q,
            @Parameter(description = "IN_STOCK u OUT_OF_STOCK")
            @RequestParam(required = false) ProductStockFilter stock,
            @Parameter(description = "Sucursal en la que se mide el filtro de stock")
            @RequestParam(required = false) Long branchId,
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidProductQueryException(
                    "page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        ProductSearchCriteria criteria = new ProductSearchCriteria(active, categoryId, q, stock, branchId);
        return ResponseEntity.ok(productService.findAll(criteria, pageable));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        String direction = parts.length == 2 ? parts[1].trim().toLowerCase() : "asc";
        if (parts.length > 2 || (!direction.equals("asc") && !direction.equals("desc"))) {
            throw new InvalidProductQueryException("sort must be <field>[,asc|desc]");
        }
        Sort.Direction dir = direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        // El id desempata para que la paginación sea estable.
        return switch (field) {
            case "name" -> Sort.by(dir, "name").and(Sort.by(dir, "id"));
            case "createdAt" -> Sort.by(dir, "createdAt").and(Sort.by(dir, "id"));
            default -> throw new InvalidProductQueryException("sort field must be one of: name, createdAt");
        };
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener producto por ID", description = "Busca y retorna un producto por su ID.")
    public ResponseEntity<ProductResponse> findById(
            @Parameter(description = "ID del producto a buscar")
            @PathVariable Long id) {
        return ResponseEntity.ok(productService.findById(id));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRODUCTOS')")
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

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRODUCTOS')")
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

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRODUCTOS')")
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

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRODUCTOS')")
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
