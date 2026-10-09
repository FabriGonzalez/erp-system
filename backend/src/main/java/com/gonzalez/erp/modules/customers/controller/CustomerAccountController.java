package com.gonzalez.erp.modules.customers.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.customers.dto.response.CustomerAccountSummaryResponse;
import com.gonzalez.erp.modules.customers.dto.response.CustomerDebtorResponse;
import com.gonzalez.erp.modules.customers.service.CustomerBalanceService;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@Tag(name = "Customer accounts", description = "Deuda y saldo a favor de los clientes")
public class CustomerAccountController {

    private static final int MAX_PAGE_SIZE = 100;

    private final CustomerBalanceService customerBalanceService;

    @GetMapping("/{id}/account")
    @Operation(summary = "Estado de cuenta del cliente", description = "Retorna el saldo contable, la deuda pendiente, el saldo a favor disponible y la cantidad de órdenes con saldo pendiente.")
    @ApiResponse(responseCode = "200", description = "Estado de cuenta obtenido")
    @ApiResponse(responseCode = "404", description = "Cliente no encontrado",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<CustomerAccountSummaryResponse> getAccount(
            @Parameter(description = "ID del cliente")
            @PathVariable Long id) {
        return ResponseEntity.ok(customerBalanceService.getSummary(id));
    }

    @GetMapping("/debtors")
    @Operation(summary = "Listar deudores", description = "Clientes con órdenes no canceladas y saldo pendiente, ordenados por deuda descendente.")
    @ApiResponse(responseCode = "200", description = "Deudores obtenidos")
    public ResponseEntity<PageResponse<CustomerDebtorResponse>> findDebtors(
            @Parameter(description = "Búsqueda por nombre del cliente")
            @RequestParam(required = false) String q,
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0) {
            throw new InvalidOrderException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidOrderException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        return ResponseEntity.ok(customerBalanceService.findDebtors(q, PageRequest.of(page, size)));
    }
}
