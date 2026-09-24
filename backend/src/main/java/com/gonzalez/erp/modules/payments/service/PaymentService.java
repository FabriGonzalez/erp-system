package com.gonzalez.erp.modules.payments.service;

import com.gonzalez.erp.modules.payments.dto.request.PaymentRequest;
import com.gonzalez.erp.modules.payments.dto.response.PaymentResponse;

import java.util.List;

public interface PaymentService {

    PaymentResponse createPayment(PaymentRequest request);

    PaymentResponse getPaymentById(Long id);

    List<PaymentResponse> getPayments(Long customerId);
}
