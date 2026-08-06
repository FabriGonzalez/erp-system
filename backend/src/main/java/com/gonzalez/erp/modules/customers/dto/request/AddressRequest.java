package com.gonzalez.erp.modules.customers.dto.request;

import jakarta.validation.constraints.Size;

public record AddressRequest(
        @Size(max = 150, message = "Street must not exceed 150 characters")
        String street,

        @Size(max = 20, message = "Number must not exceed 20 characters")
        String number,

        @Size(max = 20, message = "Apartment must not exceed 20 characters")
        String apartment,

        @Size(max = 20, message = "Floor must not exceed 20 characters")
        String floor,

        @Size(max = 100, message = "City must not exceed 100 characters")
        String city,

        @Size(max = 100, message = "State must not exceed 100 characters")
        String state,

        @Size(max = 20, message = "Postal code must not exceed 20 characters")
        String postalCode,

        @Size(max = 100, message = "Country must not exceed 100 characters")
        String country,

        @Size(max = 200, message = "Reference must not exceed 200 characters")
        String reference,

        boolean mainAddress
) {}
