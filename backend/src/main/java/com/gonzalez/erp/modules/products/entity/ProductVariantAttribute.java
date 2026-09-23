package com.gonzalez.erp.modules.products.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "product_variant_attributes",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_variant_attribute_value",
                        columnNames = {"variant_id", "attribute_value_id"}
                )
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariantAttribute extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attribute_value_id", nullable = false)
    private ProductAttributeValue attributeValue;
}
