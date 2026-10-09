package com.gonzalez.erp.modules.payments.repository;

import com.gonzalez.erp.modules.payments.entity.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
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

    void deleteByPaymentId(Long paymentId);

    void deleteByOrderId(Long orderId);

    @Query("SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order.id = :orderId")
    BigDecimal sumAmountByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.payment.id = :paymentId")
    BigDecimal sumAmountByPaymentId(@Param("paymentId") Long paymentId);
}
