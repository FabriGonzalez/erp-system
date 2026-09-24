package com.gonzalez.erp.modules.customers.repository;

import com.gonzalez.erp.modules.customers.entity.CustomerAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerAccountRepository extends JpaRepository<CustomerAccount, Long> {

    Optional<CustomerAccount> findByCustomerIdAndCompanyId(Long customerId, Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM CustomerAccount a WHERE a.customer.id = :customerId AND a.company.id = :companyId")
    Optional<CustomerAccount> findByCustomerIdAndCompanyIdForUpdate(
            @Param("customerId") Long customerId,
            @Param("companyId") Long companyId
    );

}
