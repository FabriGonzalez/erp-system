package com.gonzalez.erp.modules.promotions.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.products.entity.Product;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;

/**
 * Un producto de la promo y cuántas unidades lleva cada promo vendida. La variante de cada
 * unidad se elige al vender (cualquier variante activa del producto).
 */
@Entity
@Table(
        name = "promotion_items",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_promotion_item_product",
                        columnNames = {"promotion_id", "product_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PromotionItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "promotion_id", nullable = false)
    private Promotion promotion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Min(value = 1, message = "Promotion item quantity must be at least 1")
    @Column(nullable = false)
    private Integer quantity;
}
