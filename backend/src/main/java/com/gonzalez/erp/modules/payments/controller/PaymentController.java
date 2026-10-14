package com.gonzalez.erp.modules.payments.controller;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.payments.dto.request.PaymentRequest;
import com.gonzalez.erp.modules.payments.dto.response.PaymentResponse;
import com.gonzalez.erp.modules.payments.exception.InvalidPaymentException;
import com.gonzalez.erp.modules.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(
        name = "Payments",
        description = "Operaciones de registro, cancelación y consulta de pagos"
)
public class PaymentController {

    private static final int MAX_PAGE_SIZE = 100;

    private final PaymentService paymentService;

    @PreAuthorize("hasAuthority('REGISTRAR_PAGOS')")
    @PostMapping
    @Operation(summary = "Registrar un pago", description = "Registra un pago para un cliente, actualiza su cuenta corriente y aplica asignaciones a órdenes pendientes mediante criterio FIFO.")
    public ResponseEntity<PaymentResponse> createPayment(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.createPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PreAuthorize("hasAuthority('REGISTRAR_PAGOS')")
    @PatchMapping("/{id}/cancel")
    @Operation(summary = "Cancelar un pago", description = "Cancela un pago activo, elimina sus asignaciones y revierte su efecto contable en la cuenta corriente del cliente.")
    public ResponseEntity<PaymentResponse> cancelPayment(@PathVariable Long id) {
        PaymentResponse response = paymentService.cancelPayment(id);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyAuthority('REGISTRAR_PAGOS','VER_PEDIDOS','VER_REPORTES')")
    @GetMapping("/{id}")
    @Operation(summary = "Obtener pago por ID", description = "Obtiene los detalles de un pago específico de la empresa autenticada.")
    public ResponseEntity<PaymentResponse> getPaymentById(@PathVariable Long id) {
        PaymentResponse response = paymentService.getPaymentById(id);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasAnyAuthority('REGISTRAR_PAGOS','VER_PEDIDOS','VER_REPORTES')")
    @GetMapping
    @Operation(summary = "Listar pagos", description = "Lista paginada de los pagos de la empresa autenticada, del más nuevo al más viejo, opcionalmente filtrados por cliente. Incluye los anulados.")
    public ResponseEntity<PageResponse<PaymentResponse>> getPayments(
            @Parameter(description = "Filtrar por ID de cliente")
            @RequestParam(required = false) Long customerId,
            @Parameter(description = "Número de página, base 0")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Tamaño de página (1 a " + MAX_PAGE_SIZE + ")")
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0) {
            throw new InvalidPaymentException("page must be greater than or equal to 0");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new InvalidPaymentException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        return ResponseEntity.ok(paymentService.getPayments(customerId, pageable));
    }
}
