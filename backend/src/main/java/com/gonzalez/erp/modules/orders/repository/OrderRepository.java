package com.gonzalez.erp.modules.orders.repository;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByIdAndCompanyId(Long id, Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id AND o.company.id = :companyId")
    Optional<Order> findByIdAndCompanyIdForUpdate(@Param("id") Long id, @Param("companyId") Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT o FROM Order o
            WHERE o.customer.id = :customerId
            AND o.company.id = :companyId
            AND o.status IN (
            com.gonzalez.erp.modules.orders.entity.OrderStatus.CONFIRMED,
            com.gonzalez.erp.modules.orders.entity.OrderStatus.TO_PREPARE
            )
            ORDER BY o.createdAt ASC, o.id ASC
            """)
    List<Order> findCandidateOrdersForUpdate(
            @Param("customerId") Long customerId,
            @Param("companyId") Long companyId
    );

    Optional<Order> findByOrderNumberAndCompanyId(String orderNumber, Long companyId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(o.orderNumber, 5) AS INTEGER)), 0) FROM Order o WHERE o.company.id = :companyId")
    Long getMaxOrderNumberForCompany(@Param("companyId") Long companyId);

    @Query("""
            SELECT o FROM Order o
            WHERE o.company.id = :companyId
            AND (:status IS NULL OR o.status = :status)
            AND (:salesType IS NULL OR o.salesType = :salesType)
            AND (:deliveryType IS NULL OR o.deliveryType = :deliveryType)
            AND (:branchId IS NULL OR o.branch.id = :branchId)
            """)
    List<Order> search(
            @Param("companyId") Long companyId,
            @Param("status") OrderStatus status,
            @Param("salesType") SalesType salesType,
            @Param("deliveryType") DeliveryType deliveryType,
            @Param("branchId") Long branchId
    );
}