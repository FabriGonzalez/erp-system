package com.gonzalez.erp.modules.promotions.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.promotions.dto.request.PromotionRequest;
import com.gonzalez.erp.modules.promotions.dto.response.PromotionResponse;
import com.gonzalez.erp.modules.promotions.entity.PromotionStatus;
import com.gonzalez.erp.modules.promotions.exception.InvalidPromotionQueryException;
import com.gonzalez.erp.modules.promotions.service.PromotionService;
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

/**
 * Promos: se administran con ADMINISTRAR_PRECIOS (fijan un precio) y las lee quien vende o
 * quien las administra.
 */
@RestController
@RequestMapping("/api/v1/promotions")
@RequiredArgsConstructor
@Tag(name = "Promotions", description = "Promos: variantes con cantidad a un precio fijo, con vigencia")
public class PromotionController {

    private static final int MAX_PAGE_SIZE = 100;

    private final PromotionService promotionService;

    @PreAuthorize("hasAnyAuthority('CREAR_PEDIDOS','ADMINISTRAR_PRECIOS')")
    @GetMapping
    @Operation(summary = "Listar promos",
               description = "Paginado. q busca por nombre sin distinguir mayúsculas ni tildes. status: ACTIVE "
                       + "(vigente hoy), SCHEDULED, EXPIRED o INACTIVE. sort: name, startDate, endDate o "
                       + "createdAt, con ,asc o ,desc.")
    @ApiResponse(responseCode = "400", description = "Parámetros de paginación u orden inválidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PageResponse<PromotionResponse>> findAll(
            @Parameter(description = "Texto a buscar en el nombre")
            @RequestParam(required = false) String q,
            @Parameter(description = "ACTIVE, SCHEDULED, EXPIRED o INACTIVE. Si no se envía, todas.")
            @RequestParam(required = false) PromotionStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name,asc") String sort) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidPromotionQueryException(
                    "page must be >= 0 and size between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        return ResponseEntity.ok(promotionService.findAll(q, status, pageable));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort.split(",");
        String field = parts[0].trim();
        String direction = parts.length == 2 ? parts[1].trim().toLowerCase() : "asc";
        if (parts.length > 2 || (!direction.equals("asc") && !direction.equals("desc"))) {
            throw new InvalidPromotionQueryException("sort must be <field>[,asc|desc]");
        }
        Sort.Direction dir = direction.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        // El id desempata para que la paginación sea estable.
        return switch (field) {
            case "name", "startDate", "endDate", "createdAt" -> Sort.by(dir, field).and(Sort.by(dir, "id"));
            default -> throw new InvalidPromotionQueryException(
                    "sort field must be one of: name, startDate, endDate, createdAt");
        };
    }

    @PreAuthorize("hasAnyAuthority('CREAR_PEDIDOS','ADMINISTRAR_PRECIOS')")
    @GetMapping("/{id}")
    @Operation(summary = "Obtener promo por ID")
    public ResponseEntity<PromotionResponse> findById(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.findById(id));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRECIOS')")
    @PostMapping
    @Operation(summary = "Crear promo",
               description = "Variantes activas de la empresa sin repetir, cada una con su cantidad, a un precio fijo.")
    @ApiResponse(responseCode = "201", description = "Promo creada")
    @ApiResponse(responseCode = "400", description = "Fechas invertidas, variantes repetidas o inactivas",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<PromotionResponse> create(@Valid @RequestBody PromotionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(promotionService.create(request));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRECIOS')")
    @PatchMapping("/{id}")
    @Operation(summary = "Actualizar promo",
               description = "Reemplaza todos los datos. Los pedidos ya hechos conservan la promo como se vendió.")
    public ResponseEntity<PromotionResponse> update(@PathVariable Long id, @Valid @RequestBody PromotionRequest request) {
        return ResponseEntity.ok(promotionService.update(id, request));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRECIOS')")
    @PatchMapping("/{id}/activate")
    @Operation(summary = "Activar promo")
    public ResponseEntity<PromotionResponse> activate(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.activate(id));
    }

    @PreAuthorize("hasAuthority('ADMINISTRAR_PRECIOS')")
    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Desactivar promo", description = "No se borra: deja de poder venderse.")
    public ResponseEntity<PromotionResponse> deactivate(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.deactivate(id));
    }
}
