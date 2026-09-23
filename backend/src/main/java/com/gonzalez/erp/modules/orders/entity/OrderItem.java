package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(
        name = "order_items",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_order_item_variant",
                        columnNames = {"order_id", "product_variant_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_variant_id", nullable = false)
    private ProductVariant productVariant;

    @Min(value = 1, message = "Order quantity must be at least 1")
    @Column(nullable = false)
    private Integer quantity;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.0", message = "Unit price cannot be negative")
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;
}
