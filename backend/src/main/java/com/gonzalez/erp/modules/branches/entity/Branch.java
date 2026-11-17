package com.gonzalez.erp.modules.branches.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "branches",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_branch_company_name",
                        columnNames = {"company_id", "name"}
                )
        }
)
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class Branch extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 200)
    private String address;

    @Column(length = 20)
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    // Orden en que la tienda intenta armar un pedido; null = la sucursal no vende por la web.
    @Column(name = "store_priority")
    private Integer storePriority;

    public void update(String name, String address, String phone) {
        this.name = name;
        this.address = address;
        this.phone = phone;
    }

    public void assignStorePriority(Integer storePriority) {
        this.storePriority = storePriority;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
