package com.gonzalez.erp.modules.store.dto;

import com.gonzalez.erp.modules.customers.entity.Address;

/** Dirección del comprador. La tienda solo muestra las activas, así que no lleva ese dato. */
public record StoreAddressResponse(
        Long id,
        String label,
        String street,
        String number,
        String apartment,
        String floor,
        String city,
        String state,
        String postalCode,
        String country,
        String reference,
        boolean mainAddress
) {
    public static StoreAddressResponse from(Address address) {
        return new StoreAddressResponse(
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
                address.isMainAddress()
        );
    }
}
