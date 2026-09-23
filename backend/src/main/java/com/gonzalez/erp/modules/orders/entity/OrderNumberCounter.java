package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "order_number_counters",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_order_number_counter_company",
                        columnNames = {"company_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderNumberCounter extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "last_number", nullable = false)
    private Long lastNumber;

    public Long increment() {
        this.lastNumber = this.lastNumber + 1;
        return this.lastNumber;
    }
}