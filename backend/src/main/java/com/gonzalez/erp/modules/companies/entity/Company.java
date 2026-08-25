package com.gonzalez.erp.modules.companies.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "companies")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company extends BaseEntity {

    @NotBlank(message = "Company name is required")
    @Size(max = 100, message = "Company name must not exceed 100 characters")
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Size(max = 150, message = "Legal name must not exceed 150 characters")
    @Column(length = 150)
    private String legalName;

    @Size(max = 20, message = "Tax ID must not exceed 20 characters")
    @Column(unique = true, length = 20)
    private String taxId;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    public void update(String name, String legalName, String taxId) {
        this.name = name;
        this.legalName = legalName;
        this.taxId = taxId;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
