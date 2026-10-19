package com.gonzalez.erp.modules.payments.repository;

import com.gonzalez.erp.modules.payments.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByIdAndCompanyId(Long id, Long companyId);

    /**
     * Pagos vigentes por medio, con createdAt en [from, to). Un pago anulado deja de contar.
     * Cada fila es [method (PaymentMethod), total (BigDecimal)].
     */
    @Query("""
            SELECT p.method, COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE p.company.id = :companyId
            AND p.branch.id IN :branchIds
            AND p.status = com.gonzalez.erp.modules.payments.entity.PaymentStatus.ACTIVE
            AND p.createdAt >= :from AND p.createdAt < :to
            GROUP BY p.method
            """)
    List<Object[]> sumActiveByMethod(
            @Param("companyId") Long companyId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id AND p.company.id = :companyId")
    Optional<Payment> findByIdAndCompanyIdForUpdate(@Param("id") Long id, @Param("companyId") Long companyId);

    // Para bloquear la cuenta del cliente antes que el pago (ver PaymentServiceImpl.cancelPayment).
    @Query("SELECT p.customer.id FROM Payment p WHERE p.id = :id AND p.company.id = :companyId")
    Optional<Long> findCustomerIdByIdAndCompanyId(@Param("id") Long id, @Param("companyId") Long companyId);

    // Las relaciones a uno se traen en la misma consulta; las asignaciones, aparte y por página.
    @EntityGraph(attributePaths = {"branch", "customer", "createdBy", "cancelledBy"})
    @Query(value = """
            SELECT p FROM Payment p
            WHERE p.company.id = :companyId
            AND (:customerId IS NULL OR p.customer.id = :customerId)
            """,
            countQuery = """
            SELECT COUNT(p) FROM Payment p
            WHERE p.company.id = :companyId
            AND (:customerId IS NULL OR p.customer.id = :customerId)
            """)
    Page<Payment> search(
            @Param("companyId") Long companyId,
            @Param("customerId") Long customerId,
            Pageable pageable
    );

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
