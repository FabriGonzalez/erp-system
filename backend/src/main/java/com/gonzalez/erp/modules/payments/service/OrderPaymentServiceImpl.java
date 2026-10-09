package com.gonzalez.erp.modules.payments.service;

import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.TransactionType;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.customers.service.CustomerBalanceService;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.payments.entity.Payment;
import com.gonzalez.erp.modules.payments.entity.PaymentAllocation;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.payments.entity.PaymentStatus;
import com.gonzalez.erp.modules.payments.exception.InvalidPaymentException;
import com.gonzalez.erp.modules.payments.repository.PaymentAllocationRepository;
import com.gonzalez.erp.modules.payments.repository.PaymentRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.MANDATORY)
public class OrderPaymentServiceImpl implements OrderPaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentAllocationRepository paymentAllocationRepository;
    private final CustomerAccountService customerAccountService;
    private final CustomerBalanceService customerBalanceService;
    private final UserRepository userRepository;

    @Override
    public BigDecimal applyCredit(Order order, Long companyId) {
        Customer customer = requireCustomer(order);

        // Bloquea la cuenta para serializar operaciones concurrentes del mismo cliente.
        customerAccountService.getAccountByCustomerIdForUpdate(customer.getId(), companyId);

        BigDecimal credit = customerBalanceService.getAvailableCredit(customer.getId(), companyId);
        BigDecimal remaining = pendingOf(order).min(credit);

        if (remaining.signum() <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal applied = BigDecimal.ZERO;
        for (Payment payment : paymentRepository.findWithUnallocatedAmountForUpdate(customer.getId(), companyId)) {
            if (remaining.signum() <= 0) {
                break;
            }

            BigDecimal unallocated = payment.getAmount()
                    .subtract(paymentAllocationRepository.sumAmountByPaymentId(payment.getId()));
            BigDecimal amount = unallocated.min(remaining);

            if (amount.signum() <= 0) {
                continue;
            }

            allocate(payment, order, amount);
            remaining = remaining.subtract(amount);
            applied = applied.add(amount);
        }

        return applied;
    }

    @Override
    public void registerOrderPayment(Order order, BigDecimal amount, PaymentMethod method, Long userId, Long companyId) {
        Customer customer = requireCustomer(order);

        if (amount == null || amount.signum() <= 0) {
            throw new InvalidPaymentException("Payment amount must be greater than zero");
        }

        BigDecimal pending = pendingOf(order);
        if (amount.compareTo(pending) > 0) {
            throw new InvalidPaymentException(
                    "Initial payment (" + amount + ") exceeds the order pending balance (" + pending + ")");
        }

        Payment payment = paymentRepository.save(Payment.builder()
                .company(order.getCompany())
                .branch(order.getBranch())
                .customer(customer)
                .amount(amount)
                .method(method)
                .status(PaymentStatus.ACTIVE)
                .createdBy(userRepository.getReferenceById(userId))
                .build());

        customerAccountService.applyTransaction(
                customer.getId(),
                companyId,
                amount.negate(),
                TransactionType.PAYMENT,
                order.getBranch(),
                "Pago de pedido #" + order.getOrderNumber()
        );

        allocate(payment, order, amount);
    }

    @Override
    public void trimAllocationsToTotal(Order order) {
        BigDecimal total = order.getTotal() != null ? order.getTotal() : BigDecimal.ZERO;
        BigDecimal excess = paymentAllocationRepository.sumAmountByOrderId(order.getId()).subtract(total);

        if (excess.signum() <= 0) {
            return;
        }

        // Se libera primero lo asignado más recientemente.
        for (PaymentAllocation allocation : paymentAllocationRepository.findByOrderIdNewestFirst(order.getId())) {
            if (excess.signum() <= 0) {
                break;
            }

            if (allocation.getAmount().compareTo(excess) <= 0) {
                excess = excess.subtract(allocation.getAmount());
                allocation.getPayment().getAllocations().remove(allocation);
                paymentAllocationRepository.delete(allocation);
            } else {
                allocation.setAmount(allocation.getAmount().subtract(excess));
                paymentAllocationRepository.save(allocation);
                excess = BigDecimal.ZERO;
            }
        }
    }

    private void allocate(Payment payment, Order order, BigDecimal amount) {
        PaymentAllocation allocation = paymentAllocationRepository.save(PaymentAllocation.builder()
                .payment(payment)
                .order(order)
                .amount(amount)
                .build());
        payment.addAllocation(allocation);
    }

    private BigDecimal pendingOf(Order order) {
        BigDecimal total = order.getTotal() != null ? order.getTotal() : BigDecimal.ZERO;
        return total.subtract(paymentAllocationRepository.sumAmountByOrderId(order.getId()));
    }

    private static Customer requireCustomer(Order order) {
        if (order.getCustomer() == null) {
            throw new InvalidPaymentException("Payments cannot be registered for an anonymous customer");
        }
        return order.getCustomer();
    }
}
