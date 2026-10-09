package com.gonzalez.erp.modules.payments.repository;

import com.gonzalez.erp.modules.payments.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByIdAndCompanyId(Long id, Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id AND p.company.id = :companyId")
    Optional<Payment> findByIdAndCompanyIdForUpdate(@Param("id") Long id, @Param("companyId") Long companyId);

    List<Payment> findByCompanyId(Long companyId);

    List<Payment> findByCustomerIdAndCompanyId(Long customerId, Long companyId);

    // Pagos activos del cliente con importe todavía sin asignar a órdenes, del más viejo al más nuevo.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT p FROM Payment p
            WHERE p.customer.id = :customerId
            AND p.company.id = :companyId
            AND p.status = com.gonzalez.erp.modules.payments.entity.PaymentStatus.ACTIVE
            AND p.amount > (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.payment = p)
            ORDER BY p.createdAt ASC, p.id ASC
            """)
    List<Payment> findWithUnallocatedAmountForUpdate(
            @Param("customerId") Long customerId,
            @Param("companyId") Long companyId
    );
}
