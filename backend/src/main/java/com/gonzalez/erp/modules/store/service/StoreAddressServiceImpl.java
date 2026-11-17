package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.mapper.AddressMapper;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.store.dto.StoreAddressResponse;
import com.gonzalez.erp.modules.store.exception.StoreAuthException;
import com.gonzalez.erp.modules.store.security.StoreCustomer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * No usa AddressService del ERP porque ese saca la empresa del empleado logueado. Sí comparte
 * la entidad, el mapper y la regla de la dirección principal de Customer.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StoreAddressServiceImpl implements StoreAddressService {

    // Cualquiera puede crearse una cuenta: sin tope, una sola podría llenar la base.
    static final int MAX_ACTIVE_ADDRESSES = 5;

    private final AddressRepository addressRepository;
    private final CustomerRepository customerRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StoreAddressResponse> list() {
        return addressRepository.findByCustomerIdOrderByMainAddressDescActiveDescIdAsc(StoreCustomer.require().customerId())
                .stream()
                .filter(Address::isActive)
                .map(StoreAddressResponse::from)
                .toList();
    }

    @Override
    public StoreAddressResponse create(AddressRequest request) {
        Customer customer = currentCustomer();
        if (addressRepository.countByCustomerIdAndActiveTrue(customer.getId()) >= MAX_ACTIVE_ADDRESSES) {
            throw StoreAuthException.addressLimitReached();
        }
        Address address = AddressMapper.toEntity(request);
        customer.addAddress(address, request.requestsMain());
        addressRepository.save(address);
        return StoreAddressResponse.from(address);
    }

    @Override
    public StoreAddressResponse update(Long addressId, AddressRequest request) {
        Customer customer = currentCustomer();
        Address address = findActiveOrThrow(customer.getId(), addressId);
        AddressMapper.applyFields(address, request);
        // false no le quita el rol de principal: para cambiarla se marca otra.
        if (request.requestsMain()) {
            customer.makeMain(address);
        }
        return StoreAddressResponse.from(address);
    }

    @Override
    public void delete(Long addressId) {
        Customer customer = currentCustomer();
        customer.deactivateAddress(findActiveOrThrow(customer.getId(), addressId));
    }

    private Customer currentCustomer() {
        StoreCustomer current = StoreCustomer.require();
        return customerRepository.findByIdAndCompanyId(current.customerId(), current.companyId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }

    // La de otro comprador y la ya borrada dan el mismo 404: no se revela que existen.
    private Address findActiveOrThrow(Long customerId, Long addressId) {
        return addressRepository.findByIdAndCustomerId(addressId, customerId)
                .filter(Address::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + addressId));
    }
}
