package com.gonzalez.erp.modules.orders.repository;

import com.gonzalez.erp.modules.orders.entity.DeliveryType;
import com.gonzalez.erp.modules.orders.entity.Order;
import com.gonzalez.erp.modules.orders.entity.OrderStatus;
import com.gonzalez.erp.modules.orders.entity.SalesType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findByIdAndCompanyId(Long id, Long companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id AND o.company.id = :companyId")
    Optional<Order> findByIdAndCompanyIdForUpdate(@Param("id") Long id, @Param("companyId") Long companyId);

    // Órdenes que pueden recibir pagos: cualquier orden no cancelada del cliente.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT o FROM Order o
            WHERE o.customer.id = :customerId
            AND o.company.id = :companyId
            AND o.status IN (
            com.gonzalez.erp.modules.orders.entity.OrderStatus.CONFIRMED,
            com.gonzalez.erp.modules.orders.entity.OrderStatus.TO_PREPARE,
            com.gonzalez.erp.modules.orders.entity.OrderStatus.SHIPPED
            )
            ORDER BY o.createdAt ASC, o.id ASC
            """)
    List<Order> findCandidateOrdersForUpdate(
            @Param("customerId") Long customerId,
            @Param("companyId") Long companyId
    );

    /**
     * Órdenes no canceladas con saldo pendiente. Cada fila es
     * [customerId (Long), orderId (Long), total (BigDecimal), allocated (BigDecimal), createdAt (Instant)].
     * Si customerId es null, devuelve las de todos los clientes de la empresa.
     */
    @Query("""
            SELECT o.customer.id, o.id, o.total,
                   (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o),
                   o.createdAt
            FROM Order o
            WHERE o.company.id = :companyId
            AND o.customer IS NOT NULL
            AND (:customerId IS NULL OR o.customer.id = :customerId)
            AND o.status <> com.gonzalez.erp.modules.orders.entity.OrderStatus.CANCELLED
            AND o.total > (SELECT COALESCE(SUM(pa2.amount), 0) FROM PaymentAllocation pa2 WHERE pa2.order = o)
            ORDER BY o.createdAt ASC, o.id ASC
            """)
    List<Object[]> findPendingBalances(
            @Param("companyId") Long companyId,
            @Param("customerId") Long customerId
    );

    /**
     * Las mismas órdenes que findPendingBalances para un cliente, paginadas y en el orden en
     * que se aplican los pagos (FIFO). De toda la empresa: la deuda es del cliente, no de la
     * sucursal. Cada fila es [order (Order con branch cargada), allocated (BigDecimal)].
     */
    @Query(value = """
            SELECT o, (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o)
            FROM Order o
            JOIN FETCH o.branch
            WHERE o.company.id = :companyId
            AND o.customer.id = :customerId
            AND o.status <> com.gonzalez.erp.modules.orders.entity.OrderStatus.CANCELLED
            AND o.total > (SELECT COALESCE(SUM(pa2.amount), 0) FROM PaymentAllocation pa2 WHERE pa2.order = o)
            ORDER BY o.createdAt ASC, o.id ASC
            """,
            countQuery = """
            SELECT COUNT(o) FROM Order o
            WHERE o.company.id = :companyId
            AND o.customer.id = :customerId
            AND o.status <> com.gonzalez.erp.modules.orders.entity.OrderStatus.CANCELLED
            AND o.total > (SELECT COALESCE(SUM(pa2.amount), 0) FROM PaymentAllocation pa2 WHERE pa2.order = o)
            """)
    Page<Object[]> findPendingOrders(
            @Param("companyId") Long companyId,
            @Param("customerId") Long customerId,
            Pageable pageable
    );

    Optional<Order> findByOrderNumberAndCompanyId(String orderNumber, Long companyId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(o.orderNumber, 5) AS INTEGER)), 0) FROM Order o WHERE o.company.id = :companyId")
    Long getMaxOrderNumberForCompany(@Param("companyId") Long companyId);

    // --- Reportes: pedidos no cancelados con createdAt en [from, to) ---

    /** Ventas por sucursal. Cada fila es [branchId (Long), branchName (String), count (Long), total (BigDecimal)]. */
    @Query("""
            SELECT b.id, b.name, COUNT(o), COALESCE(SUM(o.total), 0)
            FROM Order o
            JOIN o.branch b
            WHERE o.company.id = :companyId
            AND b.id IN :branchIds
            AND o.status <> com.gonzalez.erp.modules.orders.entity.OrderStatus.CANCELLED
            AND o.createdAt >= :from AND o.createdAt < :to
            GROUP BY b.id, b.name
            ORDER BY COALESCE(SUM(o.total), 0) DESC, b.id ASC
            """)
    List<Object[]> sumSalesByBranch(
            @Param("companyId") Long companyId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    /** Total de las ventas sin cliente: se cobran al crearse y no generan un pago. */
    @Query("""
            SELECT COALESCE(SUM(o.total), 0)
            FROM Order o
            WHERE o.company.id = :companyId
            AND o.branch.id IN :branchIds
            AND o.customer IS NULL
            AND o.status <> com.gonzalez.erp.modules.orders.entity.OrderStatus.CANCELLED
            AND o.createdAt >= :from AND o.createdAt < :to
            """)
    BigDecimal sumWalkInSales(
            @Param("companyId") Long companyId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("from") Instant from,
            @Param("to") Instant to
    );

    /**
     * Variantes más vendidas por unidades. Cada fila es
     * [variantId (Long), productName (String), sku (String), quantity (Long), total (BigDecimal)].
     * El límite sale del Pageable.
     */
    @Query("""
            SELECT v.id, p.name, v.sku, SUM(i.quantity), SUM(i.unitPrice * i.quantity)
            FROM OrderItem i
            JOIN i.order o
            JOIN i.productVariant v
            JOIN v.product p
            WHERE o.company.id = :companyId
            AND o.branch.id IN :branchIds
            AND o.status <> com.gonzalez.erp.modules.orders.entity.OrderStatus.CANCELLED
            AND o.createdAt >= :from AND o.createdAt < :to
            GROUP BY v.id, p.name, v.sku
            ORDER BY SUM(i.quantity) DESC, v.id ASC
            """)
    List<Object[]> findTopSellingVariants(
            @Param("companyId") Long companyId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("from") Instant from,
            @Param("to") Instant to,
            Pageable pageable
    );

    /** Pedidos por despachar (foto actual). Una sola fila: [count (Long), oldestCreatedAt (Instant o null)]. */
    @Query("""
            SELECT COUNT(o), MIN(o.createdAt)
            FROM Order o
            WHERE o.company.id = :companyId
            AND o.branch.id IN :branchIds
            AND o.status = com.gonzalez.erp.modules.orders.entity.OrderStatus.TO_PREPARE
            """)
    List<Object[]> summarizeOrdersToPrepare(
            @Param("companyId") Long companyId,
            @Param("branchIds") Collection<Long> branchIds
    );

    // Las ventas sin cliente se cobran al crearse, por eso cuentan siempre como pagadas.
    @Query(value = """
            SELECT o FROM Order o
            LEFT JOIN o.customer c
            WHERE o.company.id = :companyId
            AND o.branch.id IN :branchIds
            AND (:status IS NULL OR o.status = :status)
            AND (:salesType IS NULL OR o.salesType = :salesType)
            AND (:deliveryType IS NULL OR o.deliveryType = :deliveryType)
            AND (:branchId IS NULL OR o.branch.id = :branchId)
            AND (:customerId IS NULL OR c.id = :customerId)
            AND (:hasQuery = false
                 OR LOWER(o.orderNumber) LIKE :query
                 OR LOWER(CONCAT(COALESCE(c.firstName, ''), ' ', COALESCE(c.lastName, ''))) LIKE :query)
            AND (:onlyPaid = false
                 OR c IS NULL
                 OR o.total <= (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o))
            AND (:onlyPending = false
                 OR (c IS NOT NULL
                     AND (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o) = 0))
            AND (:onlyPartial = false
                 OR (c IS NOT NULL
                     AND (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o) > 0
                     AND (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o) < o.total))
            """,
            countQuery = """
            SELECT COUNT(o) FROM Order o
            LEFT JOIN o.customer c
            WHERE o.company.id = :companyId
            AND o.branch.id IN :branchIds
            AND (:status IS NULL OR o.status = :status)
            AND (:salesType IS NULL OR o.salesType = :salesType)
            AND (:deliveryType IS NULL OR o.deliveryType = :deliveryType)
            AND (:branchId IS NULL OR o.branch.id = :branchId)
            AND (:customerId IS NULL OR c.id = :customerId)
            AND (:hasQuery = false
                 OR LOWER(o.orderNumber) LIKE :query
                 OR LOWER(CONCAT(COALESCE(c.firstName, ''), ' ', COALESCE(c.lastName, ''))) LIKE :query)
            AND (:onlyPaid = false
                 OR c IS NULL
                 OR o.total <= (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o))
            AND (:onlyPending = false
                 OR (c IS NOT NULL
                     AND (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o) = 0))
            AND (:onlyPartial = false
                 OR (c IS NOT NULL
                     AND (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o) > 0
                     AND (SELECT COALESCE(SUM(pa.amount), 0) FROM PaymentAllocation pa WHERE pa.order = o) < o.total))
            """)
    Page<Order> search(
            @Param("companyId") Long companyId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("status") OrderStatus status,
            @Param("salesType") SalesType salesType,
            @Param("deliveryType") DeliveryType deliveryType,
            @Param("branchId") Long branchId,
            @Param("customerId") Long customerId,
            @Param("hasQuery") boolean hasQuery,
            @Param("query") String query,
            @Param("onlyPaid") boolean onlyPaid,
            @Param("onlyPending") boolean onlyPending,
            @Param("onlyPartial") boolean onlyPartial,
            Pageable pageable
    );
}
