package com.gonzalez.erp.modules.orders.repository;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByIdAndCompanyId(Long id, Long companyId);

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