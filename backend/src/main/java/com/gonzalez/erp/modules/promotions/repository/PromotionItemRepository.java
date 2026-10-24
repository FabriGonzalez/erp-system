package com.gonzalez.erp.modules.promotions.repository;

import com.gonzalez.erp.modules.promotions.entity.PromotionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PromotionItemRepository extends JpaRepository<PromotionItem, Long> {

    /** Productos de varias promos: una consulta por página. */
    @Query("""
            SELECT i FROM PromotionItem i
            JOIN FETCH i.product
            WHERE i.promotion.id IN :promotionIds
            ORDER BY i.id ASC
            """)
    List<PromotionItem> findByPromotionIdInWithProduct(@Param("promotionIds") Collection<Long> promotionIds);
}
