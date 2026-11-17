package com.gonzalez.erp.modules.customers.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CustomerRequest(
        @Size(max = 100, message = "First name must not exceed 100 characters")
        String firstName,

        @Size(max = 100, message = "Last name must not exceed 100 characters")
        String lastName,

        @Size(max = 30, message = "Phone must not exceed 30 characters")
        String phone,

        @Size(max = 100, message = "Email must not exceed 100 characters")
        @Email(message = "Email must be valid")
        String email,

        @Size(max = 20, message = "Document type must not exceed 20 characters")
        String documentType,

        @Size(max = 50, message = "Document number must not exceed 50 characters")
        String documentNumber,

        @Size(max = 1000, message = "Observations must not exceed 1000 characters")
        String observations,

        /**
         * Solo en el alta: se crean en la misma transacción que el cliente. En la edición
         * se rechaza; las direcciones se gestionan en /customers/{id}/addresses.
         */
        @Valid
        @Size(max = 20, message = "A customer can be created with at most 20 addresses")
        List<AddressRequest> addresses
) {
    @AssertTrue(message = "First name or last name is required")
    public boolean isNamePresent() {
        return (firstName != null && !firstName.isBlank())
                || (lastName != null && !lastName.isBlank());
    }

    public boolean hasAddresses() {
        return addresses != null && !addresses.isEmpty();
    }
}
