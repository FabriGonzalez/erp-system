package com.gonzalez.erp.modules.inventory.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "stocks",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_stock_variant_branch",
                        columnNames = {"product_variant_id", "branch_id"}
                )
        },
        indexes = {
                @Index(name = "idx_stocks_company", columnList = "company_id"),
                @Index(name = "idx_stocks_company_variant", columnList = "company_id, product_variant_id"),
                @Index(name = "idx_stocks_company_branch", columnList = "company_id, branch_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stock extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_variant_id", nullable = false)
    private ProductVariant productVariant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    private Integer quantity;
}
