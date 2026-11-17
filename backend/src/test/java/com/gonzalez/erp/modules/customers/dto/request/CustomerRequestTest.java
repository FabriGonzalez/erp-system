package com.gonzalez.erp.modules.customers.dto.request;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class CustomerRequestTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void tearDown() {
        factory.close();
    }

    @Test
    void firstNameOrLastNameIsEnough() {
        assertThat(violations(customer("María", null, null))).isEmpty();
        assertThat(violations(customer(null, "García", null))).isEmpty();
    }

    @Test
    void customerWithoutNameIsRejected() {
        assertThat(violations(customer("  ", null, null)))
                .containsExactly("First name or last name is required");
    }

    @Test
    void nestedAddressesAreValidated() {
        AddressRequest withoutStreet = new AddressRequest(
                "Casa", " ", "123", null, null, "CABA", null, null, null, null, true);

        assertThat(violations(customer("María", null, List.of(withoutStreet))))
                .containsExactly("Street is required");
    }

    @Test
    void addressWithoutMainAddressFieldDeserializesAsNotMain() {
        AddressRequest address = JsonMapper.builder().build()
                .readValue("{\"street\":\"Corrientes\",\"city\":\"CABA\"}", AddressRequest.class);

        assertThat(address.requestsMain()).isFalse();
    }

    private CustomerRequest customer(String firstName, String lastName, List<AddressRequest> addresses) {
        return new CustomerRequest(firstName, lastName, null, null, null, null, null, addresses);
    }

    private Set<String> violations(CustomerRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
