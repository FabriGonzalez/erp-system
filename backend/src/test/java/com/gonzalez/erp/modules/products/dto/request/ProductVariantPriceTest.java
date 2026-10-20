package com.gonzalez.erp.modules.products.dto.request;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** El precio de una variante tiene que ser mayor a 0: así un pedido no puede quedar en $0. */
class ProductVariantPriceTest {

    private static final String MESSAGE = "Variant price must be greater than 0";

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
    void createRejectsZeroAndNegativePrices() {
        assertThat(violations(create("0"))).contains(MESSAGE);
        assertThat(violations(create("0.00"))).contains(MESSAGE);
        assertThat(violations(create("-1"))).contains(MESSAGE);
    }

    @Test
    void createAcceptsAPositivePrice() {
        assertThat(violations(create("0.01"))).doesNotContain(MESSAGE);
    }

    @Test
    void updateRejectsZeroAndAcceptsPositive() {
        assertThat(violations(update("0"))).contains(MESSAGE);
        assertThat(violations(update("1500"))).doesNotContain(MESSAGE);
    }

    private static ProductVariantRequest create(String price) {
        return new ProductVariantRequest("SKU-1", new BigDecimal(price), List.of(), List.of());
    }

    private static ProductVariantUpdateRequest update(String price) {
        return new ProductVariantUpdateRequest("SKU-1", new BigDecimal(price), List.of(), List.of());
    }

    private static <T> Set<String> violations(T request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }
}
