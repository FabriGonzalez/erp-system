package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.customers.entity.AccountTransaction;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.CustomerAccount;
import com.gonzalez.erp.modules.customers.entity.TransactionType;

import java.math.BigDecimal;

public interface CustomerAccountService {

    CustomerAccount createAccount(Customer customer);

    CustomerAccount getAccountByCustomerId(Long customerId, Long companyId);

    CustomerAccount getAccountByCustomerIdForUpdate(Long customerId, Long companyId);

    AccountTransaction applyTransaction(
            Long customerId,
            Long companyId,
            BigDecimal amount,
            TransactionType type,
            Branch branch,
            String description
    );
}
