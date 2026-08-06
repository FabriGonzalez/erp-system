package com.gonzalez.erp.modules.customers.mapper;

import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import com.gonzalez.erp.modules.customers.entity.Customer;

public final class CustomerMapper {
    private CustomerMapper() {}

    public static CustomerResponse toResponse(Customer customer) {
        return new CustomerResponse(
                customer.getId(),
                customer.getFirstName(),
                customer.getLastName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getDocumentType(),
                customer.getDocumentNumber(),
                customer.getObservations(),
                customer.isActive(),
                customer.getCreatedAt(),
                customer.getUpdatedAt()
        );
    }
}
