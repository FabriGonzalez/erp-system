package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.companies.entity.Company;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class StorePricesTest {

    @Test
    void withoutAdjustmentKeepsAPriceThatIsAlreadyAMultiple() {
        assertThat(webPrice("1230.00", "0", 10)).isEqualByComparingTo("1230.00");
    }

    @Test
    void roundsUpToTheStep() {
        assertThat(webPrice("1231.00", "0", 10)).isEqualByComparingTo("1240.00");
        assertThat(webPrice("1201.00", "0", 100)).isEqualByComparingTo("1300.00");
    }

    @Test
    void appliesAPositiveAdjustmentBeforeRounding() {
        // 1000 + 15 % = 1150, ya es múltiplo de 10.
        assertThat(webPrice("1000.00", "15", 10)).isEqualByComparingTo("1150.00");
        // 999 + 12,5 % = 1123,875 → 1130.
        assertThat(webPrice("999.00", "12.5", 10)).isEqualByComparingTo("1130.00");
    }

    @Test
    void appliesANegativeAdjustment() {
        // 1000 - 10 % = 900.
        assertThat(webPrice("1000.00", "-10", 10)).isEqualByComparingTo("900.00");
    }

    @Test
    void stepOfOneRoundsUpToWholePesos() {
        assertThat(webPrice("99.01", "0", 1)).isEqualByComparingTo("100.00");
    }

    @Test
    void theBiggestDiscountStillGivesAPositivePrice() {
        assertThat(webPrice("0.01", "-90", 10)).isEqualByComparingTo("10.00");
    }

    @Test
    void usesTheCompanySettings() {
        Company company = Company.builder().name("Acme").build();
        company.updateStorePricing(new BigDecimal("20"), 100);

        assertThat(StorePrices.webPrice(new BigDecimal("1000.00"), company)).isEqualByComparingTo("1200.00");
    }

    @Test
    void newCompanyDefaultsToSamePriceRoundedToTen() {
        Company company = Company.builder().name("Acme").build();

        assertThat(StorePrices.webPrice(new BigDecimal("1234.00"), company)).isEqualByComparingTo("1240.00");
    }

    private static BigDecimal webPrice(String erpPrice, String percent, int step) {
        return StorePrices.webPrice(new BigDecimal(erpPrice), new BigDecimal(percent), step);
    }
}
