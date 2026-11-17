package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;

/** Variante elegida en una línea de promo y sus unidades por cada promo de la línea. */
@Entity
@Table(
        name = "order_promo_components",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_order_promo_component_variant",
                        columnNames = {"order_promo_id", "product_variant_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderPromoComponent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_promo_id", nullable = false)
    private OrderPromo orderPromo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_variant_id", nullable = false)
    private ProductVariant productVariant;

    @Min(value = 1, message = "Component quantity must be at least 1")
    @Column(nullable = false)
    private Integer quantity;
}
