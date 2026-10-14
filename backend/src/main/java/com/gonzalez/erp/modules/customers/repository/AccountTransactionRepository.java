package com.gonzalez.erp.modules.customers.repository;

import com.gonzalez.erp.modules.customers.entity.AccountTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AccountTransactionRepository extends JpaRepository<AccountTransaction, Long> {

    List<AccountTransaction> findByAccountId(Long accountId);

    // Movimientos de la cuenta del cliente, del más nuevo al más viejo.
    @Query(value = """
            SELECT t FROM AccountTransaction t
            LEFT JOIN FETCH t.branch
            WHERE t.account.customer.id = :customerId
            AND t.account.company.id = :companyId
            ORDER BY t.createdAt DESC, t.id DESC
            """,
            countQuery = """
            SELECT COUNT(t) FROM AccountTransaction t
            WHERE t.account.customer.id = :customerId
            AND t.account.company.id = :companyId
            """)
    Page<AccountTransaction> findByCustomer(
            @Param("customerId") Long customerId,
            @Param("companyId") Long companyId,
            Pageable pageable
    );
}
