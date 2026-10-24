package com.gonzalez.erp.modules.promotions.entity;

import com.gonzalez.erp.modules.products.entity.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PromotionTest {

    private static final LocalDate FROM = LocalDate.of(2026, 11, 1);
    private static final LocalDate TO = LocalDate.of(2026, 11, 30);

    @Test
    void statusDependsOnTheDatesInclusiveAndTheActiveFlag() {
        Promotion promotion = promotion();

        assertThat(promotion.statusOn(FROM.minusDays(1))).isEqualTo(PromotionStatus.SCHEDULED);
        assertThat(promotion.statusOn(FROM)).isEqualTo(PromotionStatus.ACTIVE);
        assertThat(promotion.statusOn(TO)).isEqualTo(PromotionStatus.ACTIVE);
        assertThat(promotion.statusOn(TO.plusDays(1))).isEqualTo(PromotionStatus.EXPIRED);

        promotion.deactivate();
        assertThat(promotion.statusOn(FROM)).isEqualTo(PromotionStatus.INACTIVE);
    }

    @Test
    void replacingItemsKeepsTheRowOfAProductThatStays() {
        Product remera = product(1L);
        Product gorra = product(2L);
        Product media = product(3L);
        Promotion promotion = promotion();
        promotion.replaceItems(List.of(item(remera, 2), item(gorra, 1)));
        PromotionItem remeraRow = promotion.getItems().get(0);

        promotion.replaceItems(List.of(item(remera, 3), item(media, 1)));

        assertThat(promotion.getItems()).hasSize(2);
        assertThat(promotion.getItems().get(0)).isSameAs(remeraRow);
        assertThat(remeraRow.getQuantity()).isEqualTo(3);
        assertThat(promotion.getItems().get(1).getProduct()).isSameAs(media);
        assertThat(promotion.getItems().get(1).getPromotion()).isSameAs(promotion);
    }

    private static Promotion promotion() {
        return Promotion.builder()
                .name("2x1")
                .price(new BigDecimal("1000"))
                .startDate(FROM)
                .endDate(TO)
                .build();
    }

    private static Product product(Long id) {
        Product product = Product.builder().name("Producto " + id).build();
        product.setId(id);
        return product;
    }

    private static PromotionItem item(Product product, int quantity) {
        return PromotionItem.builder().product(product).quantity(quantity).build();
    }
}
