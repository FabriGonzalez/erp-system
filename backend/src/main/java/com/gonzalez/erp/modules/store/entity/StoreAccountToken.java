package com.gonzalez.erp.modules.store.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Link de un solo uso de una cuenta web. Se guarda el hash (SHA-256) del token, nunca el token:
 * el token viaja solo en el mail.
 */
@Entity
@Table(name = "store_account_tokens")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoreAccountToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_account_id", nullable = false)
    private StoreAccount account;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StoreAccountTokenType type;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    public boolean isUsable(Instant now) {
        return usedAt == null && now.isBefore(expiresAt);
    }

    public void markUsed(Instant now) {
        this.usedAt = now;
    }
}
