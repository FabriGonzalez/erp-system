package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InitialStockRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @AfterAll
    static void closeValidatorFactory() {
        validator = null;
    }

    @Test
    void acceptsZeroQuantity() {
        InitialStockRequest request = new InitialStockRequest(1L, 0);

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void rejectsNegativeQuantity() {
        InitialStockRequest request = new InitialStockRequest(1L, -1);

        assertThat(validator.validate(request))
                .anyMatch(error -> error.getPropertyPath().toString().equals("quantity"));
    }

    @Test
    void requiresBranchAndQuantity() {
        InitialStockRequest request = new InitialStockRequest(null, null);

        assertThat(validator.validate(request))
                .extracting(error -> error.getPropertyPath().toString())
                .containsExactlyInAnyOrder("branchId", "quantity");
    }
}
