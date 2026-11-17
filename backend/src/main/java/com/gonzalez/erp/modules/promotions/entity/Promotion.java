package com.gonzalez.erp.modules.promotions.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Conjunto de productos, cada uno con su cantidad, que se vende a un precio fijo; la variante
 * de cada unidad se elige al vender. Es de toda la empresa y no se aplica sola: se elige al
 * armar el pedido. Nunca se borra, solo se desactiva; lo vendido queda copiado en el pedido
 * (OrderPromo, con las variantes elegidas).
 */
@Entity
@Table(name = "promotions")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Promotion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @OneToMany(mappedBy = "promotion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Builder.Default
    private List<PromotionItem> items = new ArrayList<>();

    public void update(String name, String description, BigDecimal price, LocalDate startDate, LocalDate endDate) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /*
     * Reemplaza los productos conservando la fila de cada uno que sigue: como en
     * Order.updateItems, vaciar y volver a agregar choca con uk_promotion_item_product.
     */
    public void replaceItems(List<PromotionItem> incoming) {
        Map<Long, PromotionItem> incomingByProduct = new HashMap<>();
        for (PromotionItem item : incoming) {
            incomingByProduct.put(item.getProduct().getId(), item);
        }

        items.removeIf(existing -> !incomingByProduct.containsKey(existing.getProduct().getId()));

        Map<Long, PromotionItem> currentByProduct = new HashMap<>();
        for (PromotionItem existing : items) {
            currentByProduct.put(existing.getProduct().getId(), existing);
        }

        for (PromotionItem item : incoming) {
            PromotionItem existing = currentByProduct.get(item.getProduct().getId());
            if (existing != null) {
                existing.setQuantity(item.getQuantity());
            } else {
                item.setPromotion(this);
                items.add(item);
            }
        }
    }

    public PromotionStatus statusOn(LocalDate today) {
        if (!active) {
            return PromotionStatus.INACTIVE;
        }
        if (today.isBefore(startDate)) {
            return PromotionStatus.SCHEDULED;
        }
        if (today.isAfter(endDate)) {
            return PromotionStatus.EXPIRED;
        }
        return PromotionStatus.ACTIVE;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
