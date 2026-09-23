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
        return addressRepository.findByCustomerId(customerId).stream()
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

        Address address = Address.builder()
                .street(trim(request.street()))
                .number(trim(request.number()))
                .apartment(trim(request.apartment()))
                .floor(trim(request.floor()))
                .city(trim(request.city()))
                .state(trim(request.state()))
                .postalCode(trim(request.postalCode()))
                .country(trim(request.country()))
                .reference(trim(request.reference()))
                .mainAddress(request.mainAddress())
                .build();

        customer.addAddress(address);

        if (address.isMainAddress()) {
            makeMain(customer, address);
        }

        addressRepository.save(address);

        return AddressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public AddressResponse update(Long customerId, Long addressId, AddressRequest request) {
        Customer customer = findCustomerOrThrow(customerId);
        Address address = findAddressOrThrow(customerId, addressId);

        address.update(
                trim(request.street()),
                trim(request.number()),
                trim(request.apartment()),
                trim(request.floor()),
                trim(request.city()),
                trim(request.state()),
                trim(request.postalCode()),
                trim(request.country()),
                trim(request.reference()),
                request.mainAddress()
        );

        if (request.mainAddress()) {
            makeMain(customer, address);
        }

        return AddressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public AddressResponse deactivate(Long customerId, Long addressId) {
        Customer customer = findCustomerOrThrow(customerId);
        Address address = findAddressOrThrow(customerId, addressId);

        address.deactivate();

        if (address.isMainAddress()) {
            addressRepository.findByCustomerIdAndActiveTrueOrderByIdAsc(customerId).stream()
                    .filter(a -> !a.getId().equals(addressId))
                    .findFirst()
                    .ifPresentOrElse(
                            replacement -> makeMain(customer, replacement),
                            () -> address.removeAsMain()
                    );
        }

        return AddressMapper.toResponse(address);
    }

    @Override
    @Transactional
    public AddressResponse activate(Long customerId, Long addressId) {
        Customer customer = findCustomerOrThrow(customerId);
        Address address = findAddressOrThrow(customerId, addressId);

        address.activate();

        if (address.isMainAddress()) {
            makeMain(customer, address);
        }

        return AddressMapper.toResponse(address);
    }

    private void makeMain(Customer customer, Address target) {
        for (Address address : customer.getAddresses()) {
            if (address.equals(target)) {
                address.markAsMain();
            } else {
                address.removeAsMain();
            }
        }
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

    private String trim(String value) {
        return value == null ? null : value.trim();
    }
}
