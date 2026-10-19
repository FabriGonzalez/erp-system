package com.gonzalez.erp.modules.reports.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.reports.dto.response.DashboardResponse;
import com.gonzalez.erp.modules.reports.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@Tag(
        name = "Reports",
        description = "Métricas de ventas, cobranzas, deuda y stock"
)
public class ReportController {

    private final ReportService reportService;

    @PreAuthorize("hasAuthority('VER_REPORTES')")
    @GetMapping("/dashboard")
    @Operation(summary = "Dashboard",
               description = "Ventas, cobranzas, más vendidos y stock bajo de [from, to) en las sucursales asignadas "
                       + "al usuario (o solo branchId), comparadas con un período de la misma duración "
                       + "(por defecto, el inmediatamente anterior). "
                       + "La deuda de clientes es de toda la empresa y los pedidos por despachar son la foto actual.")
    @ApiResponse(responseCode = "400", description = "Rango o umbral inválido",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "403", description = "Sin VER_REPORTES o sucursal no asignada al usuario",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    @ApiResponse(responseCode = "404", description = "La sucursal no existe en la empresa",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<DashboardResponse> getDashboard(
            @Parameter(description = "Inicio del período (ISO-8601, inclusivo), p. ej. 2026-10-19T03:00:00Z")
            @RequestParam Instant from,
            @Parameter(description = "Fin del período (ISO-8601, exclusivo). Máximo 366 días después de from")
            @RequestParam Instant to,
            @Parameter(description = "Inicio del período de comparación, de la misma duración y sin superponerse "
                    + "(p. ej. ayer a la misma hora). Si no se envía, el inmediatamente anterior")
            @RequestParam(required = false) Instant previousFrom,
            @Parameter(description = "Sucursal; si no se envía, se suman todas las asignadas")
            @RequestParam(required = false) Long branchId,
            @Parameter(description = "Cantidad hasta la que un stock cuenta como bajo (0 a 1000)")
            @RequestParam(defaultValue = "5") int lowStockThreshold) {
        return ResponseEntity.ok(reportService.getDashboard(from, to, previousFrom, branchId, lowStockThreshold));
    }
}
