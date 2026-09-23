package com.gonzalez.erp.modules.orders.repository;

import com.gonzalez.erp.modules.orders.entity.OrderNumberCounter;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderNumberCounterRepository extends JpaRepository<OrderNumberCounter, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM OrderNumberCounter c WHERE c.company.id = :companyId")
    Optional<OrderNumberCounter> findByCompanyIdForUpdate(@Param("companyId") Long companyId);

    @Modifying
    @Query(value = """
            INSERT INTO order_number_counters (
                company_id,
                last_number,
                created_at,
                updated_at
            )
            VALUES (
                :companyId,
                :lastNumber,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (company_id) DO NOTHING
            """, nativeQuery = true)
    void insertIfAbsent(
            @Param("companyId") Long companyId,
            @Param("lastNumber") Long lastNumber
    );
}
