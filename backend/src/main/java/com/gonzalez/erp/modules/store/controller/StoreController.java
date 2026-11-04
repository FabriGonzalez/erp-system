package com.gonzalez.erp.modules.store.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.products.exception.InvalidProductQueryException;
import com.gonzalez.erp.modules.store.dto.StoreCategoryResponse;
import com.gonzalez.erp.modules.store.dto.StoreInfoResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductSummaryResponse;
import com.gonzalez.erp.modules.store.service.StoreCatalogService;
import com.gonzalez.erp.modules.store.web.CurrentStore;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Endpoints públicos de la tienda web. La tienda se identifica por Origin o X-Store-Domain. */
@RestController
@RequestMapping("/api/v1/store")
@RequiredArgsConstructor
@Tag(name = "Store", description = "Tienda web pública (sin login). Enviar X-Store-Domain al probar desde Swagger.")
@ApiResponse(responseCode = "404", description = "Dominio sin tienda, tienda deshabilitada o empresa no activa (STORE_NOT_FOUND)",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
public class StoreController {

    private static final int MAX_PAGE_SIZE = 48;

    private final StoreCatalogService catalogService;

    @GetMapping("/info")
    @Operation(summary = "Datos de la tienda", description = "Nombre y dominio de la tienda del dominio que hace el pedido.")
    public ResponseEntity<StoreInfoResponse> info() {
        CurrentStore store = CurrentStore.require();
        return ResponseEntity.ok(new StoreInfoResponse(store.name(), store.domain()));
    }

    @GetMapping("/categories")
    @Operation(summary = "Categorías", description = "Categorías activas con al menos un producto visible, por nombre.")
    public ResponseEntity<List<StoreCategoryResponse>> categories() {
        return ResponseEntity.ok(catalogService.findCategories());
    }

    @GetMapping("/products")
    @Operation(summary = "Productos",
            description = "Paginado. Solo productos visibles (activos, publicados, de categoría activa, con alguna "
                    + "variante activa). Precios web (ajuste y redondeo de la tienda). q busca en el nombre sin "
                    + "distinguir mayúsculas ni tildes. sort: name o price, con ,asc o ,desc.")
    @ApiResponse(responseCode = "400", description = "Página, tamaño u orden inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PageResponse<StoreProductSummaryResponse>> products(
            @Parameter(description = "Texto a buscar en el nombre")
            @RequestParam(required = false) String q,
            @Parameter(description = "ID de la categoría")
            @RequestParam(required = false) Long categoryId,
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "24") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidProductQueryException("page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
        return ResponseEntity.ok(catalogService.findProducts(categoryId, q, PageRequest.of(page, size, parseSort(sort))));
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Detalle de producto",
            description = "Variantes activas con atributos, precio web, fotos (las del producto si la variante no "
                    + "tiene) y disponibilidad (AVAILABLE, LOW_STOCK u OUT_OF_STOCK).")
    public ResponseEntity<StoreProductResponse> product(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.findProduct(id));
    }

    // Los campos son alias de la consulta del listado; el id desempata para que la paginación sea estable.
    private static Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        String direction = parts.length == 2 ? parts[1].trim().toLowerCase() : "asc";
        if (parts.length > 2 || (!direction.equals("asc") && !direction.equals("desc"))) {
            throw new InvalidProductQueryException("sort must be <field>[,asc|desc]");
        }
        Sort.Direction dir = direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        return switch (field) {
            case "name" -> Sort.by(dir, "name").and(Sort.by(dir, "id"));
            case "price" -> Sort.by(dir, "minPrice").and(Sort.by(dir, "id"));
            default -> throw new InvalidProductQueryException("sort field must be one of: name, price");
        };
    }
}
