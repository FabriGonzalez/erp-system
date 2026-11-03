package com.gonzalez.erp.modules.products.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Foto del producto o de una de sus variantes (nunca de los dos: lo exige un CHECK en la base). */
@Entity
@Table(name = "product_images")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_variant_id")
    private ProductVariant variant;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public void moveTo(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
