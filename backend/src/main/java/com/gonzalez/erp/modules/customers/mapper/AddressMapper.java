package com.gonzalez.erp.modules.customers.mapper;

import com.gonzalez.erp.modules.customers.dto.response.AddressResponse;
import com.gonzalez.erp.modules.customers.entity.Address;

public final class AddressMapper {
    private AddressMapper() {}

    public static AddressResponse toResponse(Address address) {
        return new AddressResponse(
                address.getId(),
                address.getStreet(),
                address.getNumber(),
                address.getApartment(),
                address.getFloor(),
                address.getCity(),
                address.getState(),
                address.getPostalCode(),
                address.getCountry(),
                address.getReference(),
                address.isMainAddress(),
                address.isActive(),
                address.getCreatedAt(),
                address.getUpdatedAt()
        );
    }
}
