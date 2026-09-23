package com.gonzalez.erp.modules.products.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "product_attributes",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_product_attribute_company_name",
                        columnNames = {"company_id", "name"}
                )
        }
)
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductAttribute extends BaseEntity {

    @NotBlank(message = "Attribute name is required")
    @Size(max = 100, message = "Attribute name must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    public void update(String name) {
        this.name = name;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
