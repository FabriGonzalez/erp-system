package com.gonzalez.erp.modules.auth.dto.request;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ChangePasswordRequestTest {

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
    void validRequestPasses() {
        assertThat(violations(new ChangePasswordRequest("Actual123", "Nueva1234", "Nueva1234"))).isEmpty();
    }

    @Test
    void confirmationMustMatch() {
        assertThat(violations(new ChangePasswordRequest("Actual123", "Nueva1234", "Nueva12345")))
                .containsExactly("Password confirmation does not match");
    }

    @Test
    void newPasswordNeedsMinimumLengthLetterAndNumber() {
        assertThat(violations(new ChangePasswordRequest("Actual123", "corta1", "corta1")))
                .contains("New password must be between 8 and 72 characters");
        assertThat(violations(new ChangePasswordRequest("Actual123", "sololetras", "sololetras")))
                .contains("New password must contain at least one letter and one number");
    }

    private Set<String> violations(ChangePasswordRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
