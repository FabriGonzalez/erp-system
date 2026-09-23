package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.users.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "orders",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_order_company_number",
                        columnNames = {"company_id", "order_number"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseEntity {

    @Column(name = "order_number", nullable = false, length = 20)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "sales_type", nullable = false, length = 20)
    private SalesType salesType;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", nullable = false, length = 20)
    private DeliveryType deliveryType;

    @Column(name = "quick_sale_amount", precision = 12, scale = 2)
    private BigDecimal quickSaleAmount;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "amount_paid", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "prepared_at")
    private Instant preparedAt;

    @Column(name = "shipped_at")
    private Instant shippedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    public void confirm() {
        if (!isDraft()) {
            throw new InvalidOrderException(
                    "Only draft orders can be confirmed. Current status: " + status);
        }
        if (deliveryType != DeliveryType.LOCAL_PICKUP) {
            throw new InvalidOrderException(
                    "Only LOCAL_PICKUP orders can be confirmed. Use prepare() for SHIPPING orders.");
        }

        this.status = OrderStatus.CONFIRMED;
        this.confirmedAt = Instant.now();
    }

    public void prepare() {
        if (!isDraft()) {
            throw new InvalidOrderException(
                    "Only draft orders can be prepared. Current status: " + status);
        }
        if (deliveryType != DeliveryType.SHIPPING) {
            throw new InvalidOrderException(
                    "Only SHIPPING orders can be prepared. Use confirm() for LOCAL_PICKUP orders.");
        }

        this.status = OrderStatus.TO_PREPARE;
        this.preparedAt = Instant.now();
    }

    public void ship() {
        if (status != OrderStatus.TO_PREPARE) {
            throw new InvalidOrderException(
                    "Only TO_PREPARE orders can be shipped. Current status: " + status);
        }
        if (deliveryType != DeliveryType.SHIPPING) {
            throw new InvalidOrderException(
                    "Only SHIPPING orders can be shipped.");
        }

        this.status = OrderStatus.SHIPPED;
        this.shippedAt = Instant.now();
    }

    public void cancel() {
        if (isCancelled()) {
            throw new InvalidOrderException(
                    "Order is already cancelled");
        }

        if (status == OrderStatus.SHIPPED || status == OrderStatus.RETURNED) {
            throw new InvalidOrderException(
                    "Cannot cancel order in status: " + status);
        }

        this.status = OrderStatus.CANCELLED;
        this.cancelledAt = Instant.now();
    }

    public void returnOrder() {
        if (status != OrderStatus.CONFIRMED && status != OrderStatus.SHIPPED) {
            throw new InvalidOrderException(
                    "Only CONFIRMED or SHIPPED orders can be returned. Current status: " + status);
        }

        this.status = OrderStatus.RETURNED;
        this.returnedAt = Instant.now();
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        this.items.add(item);
    }

    public void removeItem(OrderItem item) {
        this.items.remove(item);
        item.setOrder(null);
    }

    public void updateItems(List<OrderItem> newItems) {
        this.items.clear();
        if (newItems != null) {
            for (OrderItem item : newItems) {
                addItem(item);
            }
        }
    }

    public void recalculateTotal() {
        if (salesType == SalesType.QUICK_SALE) {
            this.total = quickSaleAmount != null ? quickSaleAmount : BigDecimal.ZERO;
        } else {
            this.total = items.stream()
                    .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
    }

    public boolean isDraft() {
        return status == OrderStatus.DRAFT;
    }

    public boolean isConfirmed() {
        return status == OrderStatus.CONFIRMED;
    }

    public boolean isToPrepare() {
        return status == OrderStatus.TO_PREPARE;
    }

    public boolean isShipped() {
        return status == OrderStatus.SHIPPED;
    }

    public boolean isCancelled() {
        return status == OrderStatus.CANCELLED;
    }

    public boolean isReturned() {
        return status == OrderStatus.RETURNED;
    }

    public boolean isEditable() {
        return status == OrderStatus.DRAFT || status == OrderStatus.TO_PREPARE;
    }

    public boolean canConfirm() {
        return isDraft() && deliveryType == DeliveryType.LOCAL_PICKUP;
    }

    public boolean canPrepare() {
        return isDraft() && deliveryType == DeliveryType.SHIPPING;
    }

    public boolean canShip() {
        return isToPrepare() && deliveryType == DeliveryType.SHIPPING;
    }

    public boolean canCancel() {
        return isDraft() || isConfirmed() || isToPrepare();
    }

    public boolean canReturn() {
        return isConfirmed() || isShipped();
    }

    public boolean requiresStockValidation() {
        return salesType == SalesType.WITH_PRODUCTS && !items.isEmpty();
    }
}