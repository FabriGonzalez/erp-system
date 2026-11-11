package com.gonzalez.erp.modules.mercadopago.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/** La cuenta de Mercado Pago de una empresa. Los tokens llegan ya cifrados: la entidad no los ve en claro. */
@Entity
@Table(name = "mercado_pago_connections")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MercadoPagoConnection extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false, unique = true, updatable = false)
    private Company company;

    @Column(name = "mp_user_id", nullable = false, unique = true)
    private long mpUserId;

    @Column(name = "access_token_encrypted", nullable = false, columnDefinition = "text")
    private String accessTokenEncrypted;

    @Column(name = "refresh_token_encrypted", nullable = false, columnDefinition = "text")
    private String refreshTokenEncrypted;

    @Column(name = "live_mode", nullable = false)
    private boolean liveMode;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "connected_at", nullable = false)
    private Instant connectedAt;

    @Column(name = "connected_by_user_id")
    private Long connectedByUserId;

    public MercadoPagoConnection(Company company) {
        this.company = company;
    }

    /** Conectar o reconectar (puede ser otra cuenta de Mercado Pago): reemplaza todo. */
    public void connect(long mpUserId, String accessTokenEncrypted, String refreshTokenEncrypted,
                        boolean liveMode, Instant expiresAt, Long connectedByUserId, Instant now) {
        this.mpUserId = mpUserId;
        this.accessTokenEncrypted = accessTokenEncrypted;
        this.refreshTokenEncrypted = refreshTokenEncrypted;
        this.liveMode = liveMode;
        this.expiresAt = expiresAt;
        this.connectedByUserId = connectedByUserId;
        this.connectedAt = now;
    }
}
