package com.gonzalez.erp.modules.store.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.entity.Customer;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Cuenta web de una ficha de cliente (origen WEB), para iniciar sesión en la tienda de su
 * empresa. No confundir con CustomerAccount, que es la cuenta corriente.
 * El email es único dentro de la empresa y se guarda en minúsculas; sin contraseña, la cuenta
 * se creó con Google (lo exige un CHECK en la base).
 */
@Entity
@Table(name = "store_accounts")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreAccount extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false, unique = true)
    private Customer customer;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "google_subject")
    private String googleSubject;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    public boolean isEmailVerified() {
        return emailVerifiedAt != null;
    }

    public void markEmailVerified(Instant now) {
        if (emailVerifiedAt == null) {
            this.emailVerifiedAt = now;
        }
    }

    /** Los tokens emitidos antes de este momento dejan de valer. */
    public void changePassword(String passwordHash, Instant now) {
        this.passwordHash = passwordHash;
        this.passwordChangedAt = now;
    }

    public void recordLogin(Instant now) {
        this.lastLoginAt = now;
    }
}
