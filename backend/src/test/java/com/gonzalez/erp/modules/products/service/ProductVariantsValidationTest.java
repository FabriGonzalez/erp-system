package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.modules.products.dto.request.ProductVariantRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantUpdateRequest;
import com.gonzalez.erp.modules.products.exception.InvalidProductVariantsException;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductVariantsValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void variantRequestsAcceptMissingAttributes() {
        ProductVariantRequest create = new ProductVariantRequest("SKU-PACK", BigDecimal.TEN, null, null, null);
        ProductVariantUpdateRequest update = new ProductVariantUpdateRequest("SKU-PACK", BigDecimal.TEN, null, null, null);

        assertThat(validator.validate(create)).isEmpty();
        assertThat(validator.validate(update)).isEmpty();
        assertThat(create.attributeValueIds()).isEmpty();
        assertThat(update.attributeValueIds()).isEmpty();
    }

    @Test
    void singleVariantWithoutAttributesIsAllowed() {
        assertThatCode(() -> ProductServiceImpl.validateVariantsWithoutAttributes(List.of(List.of())))
                .doesNotThrowAnyException();
    }

    @Test
    void severalVariantsWithAttributesAreAllowed() {
        assertThatCode(() -> ProductServiceImpl.validateVariantsWithoutAttributes(List.of(List.of(1L), List.of(2L))))
                .doesNotThrowAnyException();
    }

    @Test
    void variantWithoutAttributesMustBeTheOnlyOne() {
        assertThatThrownBy(() -> ProductServiceImpl.validateVariantsWithoutAttributes(List.of(List.of(), List.of(1L))))
                .isInstanceOf(InvalidProductVariantsException.class);
        assertThatThrownBy(() -> ProductServiceImpl.validateVariantsWithoutAttributes(List.of(List.of(), List.of())))
                .isInstanceOf(InvalidProductVariantsException.class);
    }
}
