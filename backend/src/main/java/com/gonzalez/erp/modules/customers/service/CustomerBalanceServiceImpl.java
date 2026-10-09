package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.customers.dto.response.CustomerAccountSummaryResponse;
import com.gonzalez.erp.modules.customers.dto.response.CustomerDebtorResponse;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.CustomerAccount;
import com.gonzalez.erp.modules.customers.repository.CustomerAccountRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.orders.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Calcula deuda y saldo a favor de los clientes.
 *
 * El saldo contable de la cuenta (balance) acumula cargos de órdenes, pagos y
 * reembolsos. La deuda (debt) es lo pendiente de las órdenes no canceladas.
 * Con eso, el dinero pagado que no está asignado a ninguna orden y que no fue
 * reembolsado es exactamente debt - balance.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerBalanceServiceImpl implements CustomerBalanceService {

    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAccountRepository customerAccountRepository;

    @Override
    public CustomerAccountSummaryResponse getSummary(Long customerId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        customerRepository.findByIdAndCompanyId(customerId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + customerId));

        List<Object[]> pendingRows = orderRepository.findPendingBalances(companyId, customerId);
        BigDecimal debt = sumPending(pendingRows);
        BigDecimal balance = customerAccountRepository.findByCustomerIdAndCompanyId(customerId, companyId)
                .map(CustomerAccount::getBalance)
                .orElse(BigDecimal.ZERO);

        return new CustomerAccountSummaryResponse(
                customerId,
                balance,
                debt,
                creditFrom(debt, balance),
                pendingRows.size()
        );
    }

    @Override
    public PageResponse<CustomerDebtorResponse> findDebtors(String query, Pageable pageable) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        Map<Long, DebtAccumulator> debtByCustomer = new LinkedHashMap<>();
        for (Object[] row : orderRepository.findPendingBalances(companyId, null)) {
            Long customerId = (Long) row[0];
            debtByCustomer.computeIfAbsent(customerId, id -> new DebtAccumulator())
                    .add(pendingOf(row), (Instant) row[4]);
        }

        if (debtByCustomer.isEmpty()) {
            return new PageResponse<>(List.of(), pageable.getPageNumber(), pageable.getPageSize(), 0, 0);
        }

        Map<Long, Customer> customers = customerRepository.findAllById(debtByCustomer.keySet()).stream()
                .filter(customer -> customer.getCompany().getId().equals(companyId))
                .collect(Collectors.toMap(Customer::getId, Function.identity()));

        Map<Long, BigDecimal> balances = customerAccountRepository
                .findByCompanyIdAndCustomerIdIn(companyId, debtByCustomer.keySet()).stream()
                .collect(Collectors.toMap(account -> account.getCustomer().getId(), CustomerAccount::getBalance));

        String normalizedQuery = query == null ? "" : query.trim().toLowerCase();

        List<CustomerDebtorResponse> debtors = new ArrayList<>();
        for (Map.Entry<Long, DebtAccumulator> entry : debtByCustomer.entrySet()) {
            Customer customer = customers.get(entry.getKey());
            if (customer == null) {
                continue;
            }

            String name = fullName(customer);
            if (!normalizedQuery.isEmpty() && !name.toLowerCase().contains(normalizedQuery)) {
                continue;
            }

            DebtAccumulator accumulator = entry.getValue();
            BigDecimal balance = balances.getOrDefault(entry.getKey(), BigDecimal.ZERO);

            debtors.add(new CustomerDebtorResponse(
                    customer.getId(),
                    name,
                    accumulator.debt,
                    creditFrom(accumulator.debt, balance),
                    accumulator.pendingOrders,
                    accumulator.oldestPendingOrderAt
            ));
        }

        debtors.sort(Comparator.comparing(CustomerDebtorResponse::debt).reversed()
                .thenComparing(CustomerDebtorResponse::customerId));

        int size = pageable.getPageSize();
        int fromIndex = Math.min(pageable.getPageNumber() * size, debtors.size());
        int toIndex = Math.min(fromIndex + size, debtors.size());
        int totalPages = (int) Math.ceil((double) debtors.size() / size);

        return new PageResponse<>(
                debtors.subList(fromIndex, toIndex),
                pageable.getPageNumber(),
                size,
                debtors.size(),
                totalPages
        );
    }

    @Override
    public BigDecimal getAvailableCredit(Long customerId, Long companyId) {
        BigDecimal debt = sumPending(orderRepository.findPendingBalances(companyId, customerId));
        BigDecimal balance = customerAccountRepository.findByCustomerIdAndCompanyId(customerId, companyId)
                .map(CustomerAccount::getBalance)
                .orElse(BigDecimal.ZERO);
        return creditFrom(debt, balance);
    }

    private static BigDecimal creditFrom(BigDecimal debt, BigDecimal balance) {
        return debt.subtract(balance).max(BigDecimal.ZERO);
    }

    private static BigDecimal sumPending(List<Object[]> rows) {
        BigDecimal total = BigDecimal.ZERO;
        for (Object[] row : rows) {
            total = total.add(pendingOf(row));
        }
        return total;
    }

    private static BigDecimal pendingOf(Object[] row) {
        BigDecimal orderTotal = (BigDecimal) row[2];
        BigDecimal allocated = (BigDecimal) row[3];
        return orderTotal.subtract(allocated);
    }

    private static String fullName(Customer customer) {
        String firstName = customer.getFirstName() == null ? "" : customer.getFirstName().trim();
        String lastName = customer.getLastName() == null ? "" : customer.getLastName().trim();
        return (firstName + " " + lastName).trim();
    }

    private static final class DebtAccumulator {
        private BigDecimal debt = BigDecimal.ZERO;
        private int pendingOrders;
        private Instant oldestPendingOrderAt;

        void add(BigDecimal pending, Instant createdAt) {
            debt = debt.add(pending);
            pendingOrders++;
            if (oldestPendingOrderAt == null || (createdAt != null && createdAt.isBefore(oldestPendingOrderAt))) {
                oldestPendingOrderAt = createdAt;
            }
        }
    }
}
