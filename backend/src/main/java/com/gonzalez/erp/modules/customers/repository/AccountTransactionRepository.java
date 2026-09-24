package com.gonzalez.erp.modules.customers.repository;

import com.gonzalez.erp.modules.customers.entity.AccountTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccountTransactionRepository extends JpaRepository<AccountTransaction, Long> {

    List<AccountTransaction> findByAccountId(Long accountId);
}
