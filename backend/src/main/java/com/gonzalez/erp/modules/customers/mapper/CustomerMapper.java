package com.gonzalez.erp.modules.customers.mapper;

import com.gonzalez.erp.modules.customers.dto.response.AddressResponse;
import com.gonzalez.erp.modules.customers.dto.response.CustomerResponse;
import com.gonzalez.erp.modules.customers.entity.Address;
import com.gonzalez.erp.modules.customers.entity.Customer;

import java.util.Collection;

public final class CustomerMapper {
    private CustomerMapper() {}

    /** Carga las direcciones del cliente: usar para un cliente suelto, no para listados. */
    public static CustomerResponse toResponse(Customer customer) {
        return toResponse(customer, customer.getAddresses());
    }

    /**
     * Las direcciones se reciben aparte para que un listado las traiga todas en una
     * sola consulta. Puede incluir inactivas: el resumen solo cuenta las activas.
     */
    public static CustomerResponse toResponse(Customer customer, Collection<Address> addresses) {
        int addressCount = 0;
        AddressResponse mainAddress = null;
        for (Address address : addresses) {
            if (!address.isActive()) {
                continue;
            }
            addressCount++;
            if (address.isMainAddress()) {
                mainAddress = AddressMapper.toResponse(address);
            }
        }

        return new CustomerResponse(
                customer.getId(),
                customer.getFirstName(),
                customer.getLastName(),
                customer.getPhone(),
                customer.getEmail(),
                customer.getDocumentType(),
                customer.getDocumentNumber(),
                customer.getObservations(),
                customer.getCompany().getId(),
                customer.isActive(),
                addressCount,
                mainAddress,
                customer.getCreatedAt(),
                customer.getUpdatedAt()
        );
    }
}
