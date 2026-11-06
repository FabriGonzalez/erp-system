package com.gonzalez.erp.modules.companies.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.exception.InvalidCompanyStatusTransitionException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;

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

    // El default de columna permite que ddl-auto agregue la columna sobre filas existentes.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ColumnDefault("'ACTIVE'")
    @Builder.Default
    private CompanyStatus status = CompanyStatus.ACTIVE;

    @Column(name = "status_reason", length = 500)
    private String statusReason;

    @Column(name = "status_changed_at")
    private Instant statusChangedAt;

    // Dominio y habilitación los carga el operador: la empresa no puede reclamar un dominio ajeno.
    @Column(name = "store_domain", unique = true)
    private String storeDomain;

    @Column(name = "store_enabled", nullable = false)
    @Builder.Default
    private boolean storeEnabled = false;

    // Remitente de los mails de la tienda; null = MAIL_FROM. También lo carga solo el operador.
    @Column(name = "store_mail_from", length = 254)
    private String storeMailFrom;

    @Column(name = "store_price_adjustment_percent", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal storePriceAdjustmentPercent = BigDecimal.ZERO;

    @Column(name = "store_rounding_step", nullable = false)
    @Builder.Default
    private int storeRoundingStep = 10;

    public void update(String name, String legalName, String taxId) {
        this.name = name;
        this.legalName = legalName;
        this.taxId = taxId;
    }

    public void updateStorePricing(BigDecimal priceAdjustmentPercent, int roundingStep) {
        this.storePriceAdjustmentPercent = priceAdjustmentPercent;
        this.storeRoundingStep = roundingStep;
    }

    /** Solo lo llama el operador (provisioning): la empresa no elige su dominio. */
    public void configureStore(String storeDomain, boolean storeEnabled, String storeMailFrom) {
        this.storeDomain = storeDomain;
        this.storeEnabled = storeEnabled;
        this.storeMailFrom = storeMailFrom;
    }

    /** La tienda atiende si está habilitada, tiene dominio y la empresa está activa. */
    public boolean isStoreOpen() {
        return storeEnabled && storeDomain != null && isActive();
    }

    public boolean isActive() {
        return status == CompanyStatus.ACTIVE;
    }

    public void suspend(String reason) {
        requireStatus(CompanyStatus.SUSPENDED, CompanyStatus.ACTIVE);
        changeStatus(CompanyStatus.SUSPENDED, reason);
    }

    public void reactivate() {
        requireStatus(CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED);
        changeStatus(CompanyStatus.ACTIVE, null);
    }

    public void cancel(String reason) {
        requireStatus(CompanyStatus.CANCELLED, CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED);
        changeStatus(CompanyStatus.CANCELLED, reason);
    }

    private void requireStatus(CompanyStatus target, CompanyStatus... allowedFrom) {
        for (CompanyStatus allowed : allowedFrom) {
            if (status == allowed) {
                return;
            }
        }
        throw new InvalidCompanyStatusTransitionException(status, target);
    }

    private void changeStatus(CompanyStatus newStatus, String reason) {
        this.status = newStatus;
        this.statusReason = reason;
        this.statusChangedAt = Instant.now();
    }
}
