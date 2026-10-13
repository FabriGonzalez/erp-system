package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.customers.dto.request.CustomerRequest;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import org.springframework.data.domain.Pageable;

public interface CustomerService {
    PageResponse<CustomerResponse> findAll(Boolean active, String search, Pageable pageable);
    CustomerResponse findById(Long id);
    CustomerResponse create(CustomerRequest request);
    CustomerResponse update(Long id, CustomerRequest request);
    CustomerResponse deactivate(Long id);
    CustomerResponse activate(Long id);
}
