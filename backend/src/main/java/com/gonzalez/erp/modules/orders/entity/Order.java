package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.orders.exception.InvalidOrderException;
import com.gonzalez.erp.modules.payments.entity.PaymentMethod;
import com.gonzalez.erp.modules.users.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

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
    private OrderStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "sales_type", nullable = false, length = 20)
    private SalesType salesType;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_type", nullable = false, length = 20)
    private DeliveryType deliveryType;

    @Column(name = "quick_sale_amount", precision = 12, scale = 2)
    private BigDecimal quickSaleAmount;

    // Solo en ventas sin cliente, que se cobran completas al crearse; con cliente el medio va en el pago.
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;

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

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    // El listado arma la respuesta de toda la página: se cargan en tandas y no una consulta por pedido.
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @BatchSize(size = 50)
    @Builder.Default
    private List<OrderPromo> promos = new ArrayList<>();

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

        if (status != OrderStatus.CONFIRMED && status != OrderStatus.TO_PREPARE) {
            throw new InvalidOrderException(
                    "Cannot cancel order in status: " + status);
        }

        this.status = OrderStatus.CANCELLED;
        this.cancelledAt = Instant.now();
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        this.items.add(item);
    }

    public void removeItem(OrderItem item) {
        this.items.remove(item);
        item.setOrder(null);
    }

    /*
     * Reemplaza los ítems conservando la fila de cada variante que sigue en el pedido.
     * Vaciar la lista y volver a agregar fallaba al editar: Hibernate inserta las filas
     * nuevas antes de borrar las huérfanas y choca con uk_order_item_variant.
     */
    public void updateItems(List<OrderItem> newItems) {
        List<OrderItem> incoming = newItems != null ? newItems : List.of();
        Map<Long, OrderItem> incomingByVariant = new HashMap<>();
        for (OrderItem item : incoming) {
            incomingByVariant.put(item.getProductVariant().getId(), item);
        }

        this.items.removeIf(existing ->
                !incomingByVariant.containsKey(existing.getProductVariant().getId()));

        Map<Long, OrderItem> currentByVariant = new HashMap<>();
        for (OrderItem existing : this.items) {
            currentByVariant.put(existing.getProductVariant().getId(), existing);
        }

        for (OrderItem item : incoming) {
            OrderItem existing = currentByVariant.get(item.getProductVariant().getId());
            if (existing != null) {
                existing.setQuantity(item.getQuantity());
                existing.setUnitPrice(item.getUnitPrice());
            } else {
                addItem(item);
            }
        }
    }

    /*
     * Reemplaza las líneas de promo. Las que el pedido ya tenía (por id) solo cambian la
     * cantidad: conservan nombre, precio y variantes con que se vendieron (de las entrantes se
     * usan solo id y quantity). Las entrantes sin id son líneas nuevas.
     */
    public void updatePromos(List<OrderPromo> newPromos) {
        List<OrderPromo> incoming = newPromos != null ? newPromos : List.of();
        Map<Long, OrderPromo> incomingById = new HashMap<>();
        for (OrderPromo promo : incoming) {
            if (promo.getId() != null) {
                incomingById.put(promo.getId(), promo);
            }
        }

        this.promos.removeIf(existing -> !incomingById.containsKey(existing.getId()));

        for (OrderPromo existing : this.promos) {
            existing.setQuantity(incomingById.get(existing.getId()).getQuantity());
        }

        for (OrderPromo promo : incoming) {
            if (promo.getId() == null) {
                promo.setOrder(this);
                this.promos.add(promo);
            }
        }
    }

    /**
     * Unidades de cada variante que consume el pedido: las sueltas más las de cada promo
     * (cantidad del componente × cantidad de promos). Ordenadas por id de variante, que es
     * el orden en que se bloquea el stock.
     */
    public Map<Long, Integer> quantitiesByVariant() {
        Map<Long, Integer> quantities = new TreeMap<>();
        for (OrderItem item : items) {
            quantities.merge(item.getProductVariant().getId(), item.getQuantity(), Integer::sum);
        }
        for (OrderPromo promo : promos) {
            for (OrderPromoComponent component : promo.getComponents()) {
                quantities.merge(component.getProductVariant().getId(),
                        component.getQuantity() * promo.getQuantity(), Integer::sum);
            }
        }
        return quantities;
    }

    public void recalculateTotal() {
        if (salesType == SalesType.QUICK_SALE) {
            this.total = quickSaleAmount != null ? quickSaleAmount : BigDecimal.ZERO;
        } else {
            BigDecimal itemsTotal = items.stream()
                    .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal promosTotal = promos.stream()
                    .map(promo -> promo.getUnitPrice().multiply(BigDecimal.valueOf(promo.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            this.total = itemsTotal.add(promosTotal);
        }
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

    public boolean isEditable() {
        return status == OrderStatus.TO_PREPARE;
    }

    public boolean canShip() {
        return isToPrepare() && deliveryType == DeliveryType.SHIPPING;
    }

    public boolean canCancel() {
        return isConfirmed() || isToPrepare();
    }

    public boolean requiresStockValidation() {
        return salesType == SalesType.WITH_PRODUCTS && (!items.isEmpty() || !promos.isEmpty());
    }
}