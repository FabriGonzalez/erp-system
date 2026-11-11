package com.gonzalez.erp.modules.mercadopago.repository;

import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnection;
import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MercadoPagoConnectionRepository extends JpaRepository<MercadoPagoConnection, Long> {

    Optional<MercadoPagoConnection> findByCompanyId(Long companyId);

    Optional<MercadoPagoConnection> findByMpUserId(long mpUserId);

    // Solo los ids: cada conexión se renueva después en su propia transacción.
    @Query("""
            SELECT c.id FROM MercadoPagoConnection c
            WHERE c.status = :status AND c.expiresAt < :limit
            ORDER BY c.expiresAt
            """)
    List<Long> findIdsByStatusExpiringBefore(
            @Param("status") MercadoPagoConnectionStatus status,
            @Param("limit") Instant limit);
}
