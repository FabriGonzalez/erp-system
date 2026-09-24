package com.gonzalez.erp.modules.customers.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "customer_accounts", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_customer_account_company_customer",
                columnNames = {"company_id", "customer_id"}
        )
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerAccount extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    public void updateBalance(BigDecimal delta) {
        if (delta != null) {
            this.balance = this.balance.add(delta);
        }
    }
}
