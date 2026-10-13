package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.customers.dto.response.AddressResponse;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.mapper.AddressMapper;
import com.gonzalez.erp.modules.customers.repository.AddressRepository;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final CustomerRepository customerRepository;

    @Override
    public List<AddressResponse> findByCustomerId(Long customerId) {
        findCustomerOrThrow(customerId);
        return addressRepository.findByCustomerIdOrderByMainAddressDescActiveDescIdAsc(customerId).stream()
                .map(AddressMapper::toResponse)
                .toList();
    }

    @Override
    public AddressResponse findById(Long customerId, Long addressId) {
        findCustomerOrThrow(customerId);
        return AddressMapper.toResponse(findAddressOrThrow(customerId, addressId));
    }

    @Override
    @Transactional
    public AddressResponse create(Long customerId, AddressRequest request) {
        Customer customer = findCustomerOrThrow(customerId);
        Address address = AddressMapper.toEntity(request);
        customer.addAddress(address, request.requestsMain());
        addressRepository.save(address);
        return AddressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public AddressResponse update(Long customerId, Long addressId, AddressRequest request) {
        Customer customer = findCustomerOrThrow(customerId);
        Address address = findAddressOrThrow(customerId, addressId);
        AddressMapper.applyFields(address, request);
        // false no le quita el rol de principal: para cambiarla se marca otra.
        if (request.requestsMain()) {
            customer.makeMain(address);
        }
        return AddressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public AddressResponse deactivate(Long customerId, Long addressId) {
        Customer customer = findCustomerOrThrow(customerId);
        Address address = findAddressOrThrow(customerId, addressId);
        customer.deactivateAddress(address);
        return AddressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public AddressResponse activate(Long customerId, Long addressId) {
        Customer customer = findCustomerOrThrow(customerId);
        Address address = findAddressOrThrow(customerId, addressId);
        customer.activateAddress(address);
        return AddressMapper.toResponse(address);
    }

    private Customer findCustomerOrThrow(Long customerId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        return customerRepository.findByIdAndCompanyId(customerId, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Customer not found with id: " + customerId));
    }

    private Address findAddressOrThrow(Long customerId, Long addressId) {
        return addressRepository.findByIdAndCustomerId(addressId, customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found with id: " + addressId));
    }
}
