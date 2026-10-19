package com.gonzalez.erp.modules.payments.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.TransactionType;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import com.gonzalez.erp.modules.payments.dto.request.PaymentRequest;
import com.gonzalez.erp.modules.payments.dto.response.PaymentAllocationResponse;
import com.gonzalez.erp.modules.payments.dto.response.PaymentResponse;
import com.gonzalez.erp.modules.payments.entity.Payment;
import com.gonzalez.erp.modules.payments.entity.PaymentAllocation;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.payments.entity.PaymentStatus;
import com.gonzalez.erp.modules.payments.repository.PaymentAllocationRepository;
import com.gonzalez.erp.modules.payments.repository.PaymentRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long USER_ID = 7L;
    private static final Long BRANCH_ID = 10L;
    private static final Long CUSTOMER_ID = 20L;
    private static final Long PAYMENT_ID = 300L;

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentAllocationRepository paymentAllocationRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private BranchAccessService branchAccessService;
    @Mock private UserRepository userRepository;
    @Mock private CustomerAccountService customerAccountService;

    @InjectMocks private PaymentServiceImpl paymentService;

    private Company company;
    private User user;
    private Branch branch;
    private Customer customer;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        user = User.builder()
                .username("cajero")
                .email("cajero@acme.com")
                .password("x")
                .company(company)
                .build();
        user.setId(USER_ID);
        branch = Branch.builder().name("Centro").company(company).build();
        branch.setId(BRANCH_ID);
        customer = Customer.builder().firstName("Ana").company(company).build();
        customer.setId(CUSTOMER_ID);

        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void paymentIsAllocatedFifoAndLocksOrdersBeforeTheAccount() {
        Order oldest = order(101L, "1000");
        Order newest = order(102L, "1000");
        stubCreate(List.of(oldest, newest));

        PaymentResponse response = paymentService.createPayment(request("1500"));

        assertThat(response.allocations())
                .extracting(PaymentAllocationResponse::orderId, PaymentAllocationResponse::amount)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(101L, new BigDecimal("1000")),
                        org.assertj.core.groups.Tuple.tuple(102L, new BigDecimal("500")));

        InOrder locks = inOrder(orderRepository, customerAccountService);
        locks.verify(orderRepository).findCandidateOrdersForUpdate(CUSTOMER_ID, COMPANY_ID);
        locks.verify(customerAccountService).applyTransaction(
                eq(CUSTOMER_ID), eq(COMPANY_ID), eq(new BigDecimal("-1500")),
                eq(TransactionType.PAYMENT), eq(branch), anyString());
    }

    @Test
    void paymentAboveTheDebtLeavesTheRestUnallocated() {
        stubCreate(List.of(order(101L, "1000")));

        PaymentResponse response = paymentService.createPayment(request("2500"));

        assertThat(response.amount()).isEqualByComparingTo("2500");
        assertThat(response.allocations()).hasSize(1);
        assertThat(response.allocations().get(0).amount()).isEqualByComparingTo("1000");
    }

    @Test
    void cancelLocksTheAccountBeforeThePaymentAndRevertsTheBalance() {
        Payment payment = Payment.builder()
                .company(company)
                .branch(branch)
                .customer(customer)
                .amount(new BigDecimal("800"))
                .method(PaymentMethod.CASH)
                .status(PaymentStatus.ACTIVE)
                .createdBy(user)
                .build();
        payment.setId(PAYMENT_ID);
        when(paymentRepository.findCustomerIdByIdAndCompanyId(PAYMENT_ID, COMPANY_ID))
                .thenReturn(Optional.of(CUSTOMER_ID));
        when(paymentRepository.findByIdAndCompanyIdForUpdate(PAYMENT_ID, COMPANY_ID))
                .thenReturn(Optional.of(payment));
        when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
        when(paymentRepository.save(payment)).thenReturn(payment);

        PaymentResponse response = paymentService.cancelPayment(PAYMENT_ID);

        assertThat(response.status()).isEqualTo(PaymentStatus.CANCELLED);
        InOrder locks = inOrder(customerAccountService, paymentRepository, paymentAllocationRepository);
        locks.verify(customerAccountService).getAccountByCustomerIdForUpdate(CUSTOMER_ID, COMPANY_ID);
        locks.verify(paymentRepository).findByIdAndCompanyIdForUpdate(PAYMENT_ID, COMPANY_ID);
        locks.verify(paymentAllocationRepository).deleteByPaymentId(PAYMENT_ID);
        locks.verify(customerAccountService).applyTransaction(
                eq(CUSTOMER_ID), eq(COMPANY_ID), eq(new BigDecimal("800")),
                eq(TransactionType.PAYMENT), eq(branch), anyString());
    }

    private void stubCreate(List<Order> candidates) {
        when(branchAccessService.requireAccessible(BRANCH_ID)).thenReturn(branch);
        when(customerRepository.findByIdAndCompanyId(CUSTOMER_ID, COMPANY_ID)).thenReturn(Optional.of(customer));
        when(userRepository.getReferenceById(USER_ID)).thenReturn(user);
        when(orderRepository.findCandidateOrdersForUpdate(CUSTOMER_ID, COMPANY_ID)).thenReturn(candidates);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment payment = inv.getArgument(0);
            payment.setId(PAYMENT_ID);
            return payment;
        });
        when(paymentAllocationRepository.sumAmountByOrderId(anyLong())).thenReturn(BigDecimal.ZERO);
        when(paymentAllocationRepository.save(any(PaymentAllocation.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private PaymentRequest request(String amount) {
        return new PaymentRequest(CUSTOMER_ID, BRANCH_ID, new BigDecimal(amount), PaymentMethod.CASH);
    }

    private Order order(Long id, String total) {
        Order order = Order.builder()
                .orderNumber("PED-" + id)
                .branch(branch)
                .customer(customer)
                .company(company)
                .total(new BigDecimal(total))
                .build();
        order.setId(id);
        return order;
    }
}
