package com.gonzalez.erp.modules.products.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(
        name = "product_attribute_values",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_product_attribute_value",
                        columnNames = {"attribute_id", "value"}
                )
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductAttributeValue extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "attribute_id", nullable = false)
    private ProductAttribute attribute;

    @NotBlank(message = "Value is required")
    @Size(max = 100, message = "Value must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String value;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // Colores de la muestra en orden (#RRGGBB); null si el valor no tiene muestra.
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "swatch_colors", columnDefinition = "varchar(7)[]")
    private List<String> swatchColors;

    public void update(String value, List<String> swatchColors) {
        this.value = value;
        this.swatchColors = swatchColors;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
