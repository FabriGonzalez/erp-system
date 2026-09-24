package com.gonzalez.erp.modules.payments.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.TransactionType;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.dto.request.PaymentRequest;
import com.gonzalez.erp.modules.payments.dto.response.PaymentResponse;
import com.gonzalez.erp.modules.payments.entity.Payment;
import com.gonzalez.erp.modules.payments.entity.PaymentAllocation;
import com.gonzalez.erp.modules.payments.exception.InvalidPaymentException;
import com.gonzalez.erp.modules.payments.mapper.PaymentMapper;
import com.gonzalez.erp.modules.payments.repository.PaymentAllocationRepository;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import com.gonzalez.erp.modules.payments.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentAllocationRepository paymentAllocationRepository;
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final BranchRepository branchRepository;
    private final UserBranchRepository userBranchRepository;
    private final CustomerAccountService customerAccountService;

    @Override
    @Transactional
    public PaymentResponse createPayment(PaymentRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        if (request.customerId() == null) {
            throw new InvalidPaymentException("Payment cannot be registered for an anonymous customer");
        }

        if (request.amount() == null || request.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidPaymentException("Payment amount must be greater than zero");
        }

        Branch branch = branchRepository.findByIdAndCompanyId(request.branchId(), companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Branch not found with id: " + request.branchId() + " in current company"));

        if (!userBranchRepository.existsByUserIdAndBranchId(userId, request.branchId())) {
            throw new AccessDeniedException(
                    "User is not assigned to branch: " + request.branchId());
        }

        Customer customer = customerRepository.findByIdAndCompanyId(request.customerId(), companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer not found with id: " + request.customerId() + " in current company"));

        Payment payment = Payment.builder()
                .company(customer.getCompany())
                .branch(branch)
                .customer(customer)
                .amount(request.amount())
                .method(request.method())
                .build();

        payment = paymentRepository.save(payment);

        customerAccountService.applyTransaction(
                customer.getId(),
                companyId,
                request.amount().negate(),
                TransactionType.PAYMENT,
                branch,
                "Pago recibido #" + payment.getId()
        );

        List<Order> candidateOrders = orderRepository.findCandidateOrdersForUpdate(customer.getId(), companyId);
        BigDecimal remainingPayment = request.amount();

        for (Order order : candidateOrders) {
            if (remainingPayment.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            BigDecimal currentAllocated = paymentAllocationRepository.sumAmountByOrderId(order.getId());
            BigDecimal orderTotal = order.getTotal() != null ? order.getTotal() : BigDecimal.ZERO;
            BigDecimal pendingBalance = orderTotal.subtract(currentAllocated);

            if (pendingBalance.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal allocationAmount = remainingPayment.min(pendingBalance);

            PaymentAllocation allocation = PaymentAllocation.builder()
                    .payment(payment)
                    .order(order)
                    .amount(allocationAmount)
                    .build();

            allocation = paymentAllocationRepository.save(allocation);
            payment.addAllocation(allocation);

            remainingPayment = remainingPayment.subtract(allocationAmount);
        }

        return PaymentMapper.toResponse(payment);
    }

    @Override
    public PaymentResponse getPaymentById(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Payment payment = paymentRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
        return PaymentMapper.toResponse(payment);
    }

    @Override
    public List<PaymentResponse> getPayments(Long customerId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<Payment> payments;
        if (customerId != null) {
            payments = paymentRepository.findByCustomerIdAndCompanyId(customerId, companyId);
        } else {
            payments = paymentRepository.findByCompanyId(companyId);
        }
        return payments.stream()
                .map(PaymentMapper::toResponse)
                .toList();
    }
}
