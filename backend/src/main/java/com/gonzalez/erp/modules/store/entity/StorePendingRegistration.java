package com.gonzalez.erp.modules.store.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Registro en la tienda que espera la verificación del email. Guarda todo lo necesario para crear
 * la cuenta y la ficha cuando se toca el link; hasta entonces no existe nada más. Del token del
 * link se guarda solo el hash.
 */
@Entity
@Table(name = "store_pending_registrations")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StorePendingRegistration extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(length = 30)
    private String phone;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt);
    }

    /** Reenvío: un link nuevo con su propio vencimiento; el anterior deja de servir. */
    public void renewToken(String tokenHash, Instant expiresAt) {
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }
}
