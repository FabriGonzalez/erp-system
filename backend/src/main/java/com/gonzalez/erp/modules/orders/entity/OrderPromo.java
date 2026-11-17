package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Una línea de promo del pedido: una combinación de variantes elegidas, vendida quantity veces.
 * La misma promo puede ir en varias líneas. Nombre, precio y variantes se copian al venderla:
 * lo vendido no cambia aunque la promo se edite, venza o se desactive después.
 */
@Entity
@Table(name = "order_promos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderPromo extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "promotion_id", nullable = false)
    private Promotion promotion;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Min(value = 1, message = "Promo quantity must be at least 1")
    @Column(nullable = false)
    private Integer quantity;

    @OneToMany(mappedBy = "orderPromo", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @BatchSize(size = 50)
    @Builder.Default
    private List<OrderPromoComponent> components = new ArrayList<>();

    public void addComponent(OrderPromoComponent component) {
        component.setOrderPromo(this);
        components.add(component);
    }
}
