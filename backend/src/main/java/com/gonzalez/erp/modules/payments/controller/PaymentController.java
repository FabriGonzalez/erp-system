package com.gonzalez.erp.modules.payments.controller;

import com.gonzalez.erp.modules.payments.dto.request.PaymentRequest;
import com.gonzalez.erp.modules.payments.dto.response.PaymentResponse;
import com.gonzalez.erp.modules.payments.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(
        name = "Payments",
        description = "Operaciones de registro y consulta de pagos y asignación de pagos a órdenes"
)
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @Operation(summary = "Registrar un pago", description = "Registra un pago para un cliente, actualiza su cuenta corriente y aplica asignaciones a órdenes pendientes mediante criterio FIFO.")
    public ResponseEntity<PaymentResponse> createPayment(@Valid @RequestBody PaymentRequest request) {
        PaymentResponse response = paymentService.createPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener pago por ID", description = "Obtiene los detalles de un pago específico de la empresa autenticada.")
    public ResponseEntity<PaymentResponse> getPaymentById(@PathVariable Long id) {
        PaymentResponse response = paymentService.getPaymentById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Listar pagos", description = "Lista los pagos de la empresa autenticada, opcionalmente filtrados por cliente.")
    public ResponseEntity<List<PaymentResponse>> getPayments(
            @Parameter(description = "Filtrar por ID de cliente")
            @RequestParam(required = false) Long customerId) {
        List<PaymentResponse> payments = paymentService.getPayments(customerId);
        return ResponseEntity.ok(payments);
    }
}
