package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.users.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private OrderStatus status = OrderStatus.DRAFT;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    public void confirm() {
        if (!isDraft()) {
            throw new InvalidOrderException(
                    "Only draft orders can be confirmed. Current status: " + status);
        }

        this.status = OrderStatus.CONFIRMED;
        this.confirmedAt = Instant.now();
    }

    public void cancel() {
        if (isCancelled()) {
            throw new InvalidOrderException(
                    "Order is already cancelled");
        }

        if (!isDraft() && !isConfirmed()) {
            throw new InvalidOrderException(
                    "Only draft or confirmed orders can be cancelled");
        }

        this.status = OrderStatus.CANCELLED;
        this.cancelledAt = Instant.now();
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        this.items.add(item);
    }

    public boolean isDraft() {
        return status == OrderStatus.DRAFT;
    }

    public boolean isConfirmed() {
        return status == OrderStatus.CONFIRMED;
    }

    public boolean isCancelled() {
        return status == OrderStatus.CANCELLED;
    }
}
