package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import com.gonzalez.erp.modules.promotions.entity.PromotionItem;
import com.gonzalez.erp.modules.store.dto.StoreAvailability;
import com.gonzalez.erp.modules.store.dto.StorePromotionResponse;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class StoreCatalogServiceImplTest {

    private static final Long SHIRT = 1L;
    private static final Long CAP = 2L;
    // Remera desde $900 ERP y gorra desde $1000 ERP: con +10% y redondeo a $10, $990 y $1100 web.
    private static final Map<Long, BigDecimal> MIN_PRICES = Map.of(SHIRT, new BigDecimal("900"), CAP, new BigDecimal("1000"));
    private static final Map<Long, String> COVERS = Map.of(SHIRT, "https://cdn/remera.png");

    @Test
    void availabilityDoesNotExposeTheQuantity() {
        assertThat(StoreCatalogServiceImpl.availabilityOf(-2)).isEqualTo(StoreAvailability.OUT_OF_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(0)).isEqualTo(StoreAvailability.OUT_OF_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(1)).isEqualTo(StoreAvailability.LOW_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(3)).isEqualTo(StoreAvailability.LOW_STOCK);
        assertThat(StoreCatalogServiceImpl.availabilityOf(4)).isEqualTo(StoreAvailability.AVAILABLE);
        assertThat(StoreCatalogServiceImpl.availabilityOf(500)).isEqualTo(StoreAvailability.AVAILABLE);
    }

    @Test
    void aPromotionHasWebPricesSavingsAndItsItems() {
        // 2 remeras + 1 gorra a $2500 ERP: $2750 web contra 2 × 990 + 1100 = $3080 por separado.
        StorePromotionResponse response = StoreCatalogServiceImpl.toPromotionResponse(
                promotion("2500"), company(), MIN_PRICES, Map.of(SHIRT, 2L, CAP, 1L), COVERS);

        assertThat(response.webPrice()).isEqualByComparingTo("2750");
        assertThat(response.regularWebPrice()).isEqualByComparingTo("3080");
        assertThat(response.savings()).isEqualByComparingTo("330");
        assertThat(response.availability()).isEqualTo(StoreAvailability.AVAILABLE);
        assertThat(response.endDate()).isEqualTo(LocalDate.of(2026, 11, 30));
        assertThat(response.items()).containsExactly(
                new StorePromotionResponse.Item(SHIRT, "Remera", 2, "https://cdn/remera.png"),
                new StorePromotionResponse.Item(CAP, "Gorra", 1, null));
    }

    @Test
    void noSavingsAreShownWhenThePromotionIsNotCheaper() {
        Map<Long, Long> stock = Map.of(SHIRT, 5L, CAP, 5L);

        StorePromotionResponse dearer = StoreCatalogServiceImpl.toPromotionResponse(
                promotion("3000"), company(), MIN_PRICES, stock, COVERS);
        StorePromotionResponse same = StoreCatalogServiceImpl.toPromotionResponse(
                promotion("2800"), company(), MIN_PRICES, stock, COVERS);

        assertThat(dearer.webPrice()).isEqualByComparingTo("3300");
        assertThat(dearer.regularWebPrice()).isNull();
        assertThat(dearer.savings()).isNull();
        assertThat(same.webPrice()).isEqualByComparingTo("3080");
        assertThat(same.savings()).isNull();
    }

    @Test
    void aPromotionIsOutOfStockIfAnyProductLacksTheUnitsItNeeds() {
        assertThat(StoreCatalogServiceImpl.toPromotionResponse(
                promotion("2500"), company(), MIN_PRICES, Map.of(SHIRT, 1L, CAP, 9L), COVERS).availability())
                .isEqualTo(StoreAvailability.OUT_OF_STOCK);
        assertThat(StoreCatalogServiceImpl.toPromotionResponse(
                promotion("2500"), company(), MIN_PRICES, Map.of(SHIRT, 9L), COVERS).availability())
                .isEqualTo(StoreAvailability.OUT_OF_STOCK);
    }

    private static Company company() {
        Company company = Company.builder().name("Acme").build();
        company.updateStorePricing(new BigDecimal("10"), 10);
        return company;
    }

    private static Promotion promotion(String price) {
        Promotion promotion = Promotion.builder()
                .name("Combo").price(new BigDecimal(price))
                .startDate(LocalDate.of(2026, 11, 1)).endDate(LocalDate.of(2026, 11, 30))
                .build();
        promotion.setId(10L);
        promotion.getItems().add(item(promotion, SHIRT, "Remera", 2));
        promotion.getItems().add(item(promotion, CAP, "Gorra", 1));
        return promotion;
    }

    private static PromotionItem item(Promotion promotion, Long productId, String name, int quantity) {
        Product product = Product.builder().name(name).build();
        product.setId(productId);
        return PromotionItem.builder().promotion(promotion).product(product).quantity(quantity).build();
    }
}
