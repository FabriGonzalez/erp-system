package com.gonzalez.erp.modules.payments.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.payments.dto.request.PaymentRequest;
import com.gonzalez.erp.modules.payments.dto.response.PaymentResponse;
import org.springframework.data.domain.Pageable;

public interface PaymentService {

    PaymentResponse createPayment(PaymentRequest request);

    PaymentResponse cancelPayment(Long id);

    PaymentResponse getPaymentById(Long id);

    /** Pagos de la empresa (opcionalmente de un cliente), del más nuevo al más viejo. */
    PageResponse<PaymentResponse> getPayments(Long customerId, Pageable pageable);
}
