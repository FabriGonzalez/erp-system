package com.gonzalez.erp.modules.shipments.repository;

import com.gonzalez.erp.modules.shipments.entity.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShipmentRepository extends JpaRepository<Shipment, Long> {

    boolean existsByOrderId(Long orderId);

    Optional<Shipment> findByOrderId(Long orderId);
}
