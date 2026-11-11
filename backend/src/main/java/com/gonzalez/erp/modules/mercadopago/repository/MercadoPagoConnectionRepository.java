package com.gonzalez.erp.modules.mercadopago.repository;

import com.gonzalez.erp.modules.mercadopago.entity.MercadoPagoConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MercadoPagoConnectionRepository extends JpaRepository<MercadoPagoConnection, Long> {

    Optional<MercadoPagoConnection> findByCompanyId(Long companyId);

    Optional<MercadoPagoConnection> findByMpUserId(long mpUserId);
}
