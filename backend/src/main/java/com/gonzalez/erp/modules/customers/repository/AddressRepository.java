package com.gonzalez.erp.modules.customers.repository;

import com.gonzalez.erp.modules.customers.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Long> {

    List<Address> findByCustomerId(Long customerId);

    Optional<Address> findByIdAndCustomerId(Long addressId, Long customerId);

    List<Address> findByCustomerIdAndActiveTrueOrderByIdAsc(Long customerId);

    Optional<Address> findByCustomerIdAndMainAddressTrue(Long customerId);
}
