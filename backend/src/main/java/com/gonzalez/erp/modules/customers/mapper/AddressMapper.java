package com.gonzalez.erp.modules.customers.mapper;

import com.gonzalez.erp.modules.customers.dto.request.AddressRequest;
import com.gonzalez.erp.modules.customers.dto.response.AddressResponse;
import com.gonzalez.erp.modules.customers.entity.Address;

public final class AddressMapper {
    private AddressMapper() {}

    /** Sin cliente ni rol de principal: los asigna Customer.addAddress. */
    public static Address toEntity(AddressRequest request) {
        // El builder aplica los @Builder.Default (active = true).
        Address address = Address.builder().build();
        applyFields(address, request);
        return address;
    }

    public static void applyFields(Address address, AddressRequest request) {
        address.update(
                clean(request.label()),
                clean(request.street()),
                clean(request.number()),
                clean(request.apartment()),
                clean(request.floor()),
                clean(request.city()),
                clean(request.state()),
                clean(request.postalCode()),
                clean(request.country()),
                clean(request.reference())
        );
    }

    /** Recorta espacios y guarda null en lugar de texto vacío. */
    private static String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static AddressResponse toResponse(Address address) {
        return new AddressResponse(
                address.getId(),
                address.getLabel(),
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
