package com.gonzalez.erp.modules.payments.repository;

import com.gonzalez.erp.modules.payments.entity.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;

public interface PaymentAllocationRepository extends JpaRepository<PaymentAllocation, Long> {

    List<PaymentAllocation> findByPaymentId(Long paymentId);

    List<PaymentAllocation> findByOrderId(Long orderId);

    @Query("""
            SELECT pa FROM PaymentAllocation pa
            WHERE pa.order.id = :orderId
            ORDER BY pa.createdAt DESC, pa.id DESC
            """)
    List<PaymentAllocation> findByOrderIdNewestFirst(@Param("orderId") Long orderId);

    // Asignaciones de una página de pagos, con su orden, en una sola consulta.
    @Query("""
            SELECT pa FROM PaymentAllocation pa
            JOIN FETCH pa.order
            WHERE pa.payment.id IN :paymentIds
            ORDER BY pa.createdAt ASC, pa.id ASC
            """)
    List<PaymentAllocation> findByPaymentIdInWithOrder(@Param("paymentIds") Collection<Long> paymentIds);

    void deleteByPaymentId(Long paymentId);

    void deleteByOrderId(Long orderId);

    @Query("SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order.id = :orderId")
    BigDecimal sumAmountByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.payment.id = :paymentId")
    BigDecimal sumAmountByPaymentId(@Param("paymentId") Long paymentId);
}
