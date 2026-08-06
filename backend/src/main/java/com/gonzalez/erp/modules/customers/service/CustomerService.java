package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.modules.customers.dto.request.CustomerRequest;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;

import java.util.List;

public interface CustomerService {
    List<CustomerResponse> findAll(Boolean active, String search);
    CustomerResponse findById(Long id);
    CustomerResponse create(CustomerRequest request);
    CustomerResponse update(Long id, CustomerRequest request);
    CustomerResponse deactivate(Long id);
    CustomerResponse activate(Long id);
}
