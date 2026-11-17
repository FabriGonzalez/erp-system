package com.gonzalez.erp.modules.orders.entity;

import com.gonzalez.erp.modules.products.entity.ProductVariant;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OrderTest {

    private static ProductVariant variant(long id) {
        ProductVariant variant = ProductVariant.builder().build();
        variant.setId(id);
        return variant;
    }

    private static OrderItem item(ProductVariant variant, int quantity, String price) {
        return OrderItem.builder()
                .productVariant(variant)
                .quantity(quantity)
                .unitPrice(new BigDecimal(price))
                .build();
    }

    @Test
    void updateItemsKeepsTheRowOfVariantsThatStayInTheOrder() {
        ProductVariant kept = variant(1L);
        ProductVariant removed = variant(2L);
        ProductVariant added = variant(3L);

        Order order = Order.builder().build();
        order.updateItems(List.of(item(kept, 1, "100"), item(removed, 1, "50")));
        OrderItem keptRow = order.getItems().get(0);

        order.updateItems(List.of(item(kept, 3, "120"), item(added, 2, "10")));

        assertThat(order.getItems()).hasSize(2);
        // Misma instancia: Hibernate hace UPDATE en lugar de DELETE + INSERT de la misma variante.
        assertThat(order.getItems().get(0)).isSameAs(keptRow);
        assertThat(keptRow.getQuantity()).isEqualTo(3);
        assertThat(keptRow.getUnitPrice()).isEqualByComparingTo("120");
        assertThat(order.getItems().get(1).getProductVariant()).isSameAs(added);
        assertThat(order.getItems().get(1).getOrder()).isSameAs(order);
        assertThat(order.getItems())
                .noneMatch(orderItem -> orderItem.getProductVariant() == removed);
    }

    @Test
    void updateItemsWithEmptyListRemovesEverything() {
        Order order = Order.builder().build();
        order.updateItems(List.of(item(variant(1L), 1, "100")));

        order.updateItems(null);

        assertThat(order.getItems()).isEmpty();
    }
}
