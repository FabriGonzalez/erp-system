package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.customers.entity.AccountTransaction;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.CustomerAccount;
import com.gonzalez.erp.modules.customers.entity.TransactionType;
import com.gonzalez.erp.modules.customers.repository.AccountTransactionRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerAccountServiceImpl implements CustomerAccountService {

    private final CustomerAccountRepository customerAccountRepository;
    private final AccountTransactionRepository accountTransactionRepository;

    @Override
    @Transactional
    public CustomerAccount createAccount(Customer customer) {
        CustomerAccount account = CustomerAccount.builder()
                .customer(customer)
                .company(customer.getCompany())
                .balance(BigDecimal.ZERO)
                .active(true)
                .build();

        return customerAccountRepository.save(account);
    }

    @Override
    public CustomerAccount getAccountByCustomerId(Long customerId, Long companyId) {
        return customerAccountRepository.findByCustomerIdAndCompanyId(customerId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer account not found for customer id: " + customerId + " and company id: " + companyId));
    }

    @Override
    public CustomerAccount getAccountByCustomerIdForUpdate(Long customerId, Long companyId) {
        return customerAccountRepository.findByCustomerIdAndCompanyIdForUpdate(customerId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Customer account not found for customer id: " + customerId + " and company id: " + companyId));
    }

    @Override
    @Transactional
    public AccountTransaction applyTransaction(
            Long customerId,
            Long companyId,
            BigDecimal amount,
            TransactionType type,
            Branch branch,
            String description) {

        if (customerId == null) {
                throw new IllegalArgumentException("Customer id is required");
        }

        if (companyId == null) {
                throw new IllegalArgumentException("Company id is required");
        }


        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            throw new IllegalArgumentException("Transaction amount must be different from zero");
        }

        if (type == null) {
            throw new IllegalArgumentException("Transaction type is required");
        }

        CustomerAccount account = getAccountByCustomerIdForUpdate(customerId, companyId);

        account.updateBalance(amount);

        AccountTransaction transaction = AccountTransaction.builder()
                .account(account)
                .amount(amount)
                .type(type)
                .branch(branch)
                .description(description)
                .build();

        return accountTransactionRepository.save(transaction);
    }
}
