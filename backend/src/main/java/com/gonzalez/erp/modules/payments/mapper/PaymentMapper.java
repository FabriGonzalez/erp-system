package com.gonzalez.erp.modules.payments.mapper;

import com.gonzalez.erp.modules.payments.dto.response.PaymentAllocationResponse;
import com.gonzalez.erp.modules.payments.dto.response.PaymentResponse;
import com.gonzalez.erp.modules.payments.entity.Payment;
import com.gonzalez.erp.modules.payments.entity.PaymentAllocation;

import java.util.Collections;
import java.util.List;

public final class PaymentMapper {

    private PaymentMapper() {}

    public static PaymentAllocationResponse toAllocationResponse(PaymentAllocation allocation) {
        if (allocation == null) {
            return null;
        }
        return new PaymentAllocationResponse(
                allocation.getId(),
                allocation.getOrder() != null ? allocation.getOrder().getId() : null,
                allocation.getOrder() != null ? allocation.getOrder().getOrderNumber() : null,
                allocation.getAmount(),
                allocation.getCreatedAt()
        );
    }

    public static PaymentResponse toResponse(Payment payment) {
        if (payment == null) {
            return null;
        }
        return toResponse(payment, payment.getAllocations() != null
                ? payment.getAllocations()
                : Collections.emptyList());
    }

    /** Con las asignaciones ya cargadas aparte (listados: evita una consulta por pago). */
    public static PaymentResponse toResponse(Payment payment, List<PaymentAllocation> paymentAllocations) {
        List<PaymentAllocationResponse> allocations = paymentAllocations.stream()
                .map(PaymentMapper::toAllocationResponse)
                .toList();

        String customerName = null;
        if (payment.getCustomer() != null) {
            String firstName = payment.getCustomer().getFirstName() != null ? payment.getCustomer().getFirstName() : "";
            String lastName = payment.getCustomer().getLastName() != null ? payment.getCustomer().getLastName() : "";
            customerName = (firstName + " " + lastName).trim();
        }

        return new PaymentResponse(
                payment.getId(),
                payment.getCompany() != null ? payment.getCompany().getId() : null,
                payment.getBranch() != null ? payment.getBranch().getId() : null,
                payment.getBranch() != null ? payment.getBranch().getName() : null,
                payment.getCustomer() != null ? payment.getCustomer().getId() : null,
                customerName,
                payment.getAmount(),
                payment.getMethod(),
                payment.getStatus(),
                payment.getCreatedBy() != null ? payment.getCreatedBy().getId() : null,
                payment.getCreatedBy() != null ? payment.getCreatedBy().getUsername() : null,
                payment.getCreatedAt(),
                payment.getCancelledAt(),
                payment.getCancelledBy() != null ? payment.getCancelledBy().getId() : null,
                payment.getCancelledBy() != null ? payment.getCancelledBy().getUsername() : null,
                allocations
        );
    }
}
