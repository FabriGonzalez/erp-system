package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.customers.dto.response.AddressResponse;

import java.util.List;

public interface AddressService {
    List<AddressResponse> findByCustomerId(Long customerId);
    AddressResponse findById(Long customerId, Long addressId);
    AddressResponse create(Long customerId, AddressRequest request);
    AddressResponse update(Long customerId, Long addressId, AddressRequest request);
    AddressResponse deactivate(Long customerId, Long addressId);
    AddressResponse activate(Long customerId, Long addressId);
}
