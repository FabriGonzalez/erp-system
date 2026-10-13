package com.gonzalez.erp.modules.customers.repository;

import com.gonzalez.erp.modules.customers.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Long> {
    /** Primero la principal, después las activas, y por antigüedad. */
    List<Address> findByCustomerIdOrderByMainAddressDescActiveDescIdAsc(Long customerId);

    Optional<Address> findByIdAndCustomerId(Long addressId, Long customerId);

    /** Para el resumen de direcciones de una página de clientes en una sola consulta. */
    List<Address> findByCustomerIdInAndActiveTrue(Collection<Long> customerIds);
}
