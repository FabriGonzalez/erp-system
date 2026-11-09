package com.gonzalez.erp.modules.store.repository;

import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.promotions.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Consultas del catálogo público. Visible = producto activo y publicado, de categoría activa,
 * con al menos una variante activa; de las variantes solo cuentan las activas.
 * Solo lectura: no extiende JpaRepository para que la tienda no pueda guardar ni borrar nada.
 */
public interface StoreCatalogRepository extends Repository<Product, Long> {

    /** Una fila del listado: el producto con el rango de precios ERP de sus variantes activas. */
    interface ProductRow {
        Long getId();
        String getName();
        Long getCategoryId();
        String getCategoryName();
        BigDecimal getMinPrice();
        BigDecimal getMaxPrice();
    }

    /** El precio ERP más barato entre las variantes activas de un producto. */
    interface ProductMinPrice {
        Long getProductId();
        BigDecimal getMinPrice();
    }

    /** Stock de una variante activa sumado en las sucursales activas. */
    interface VariantStock {
        Long getProductId();
        Long getVariantId();
        Long getQuantity();
    }

    /*
     * Ordenar por precio web = ordenar por el precio ERP mínimo: todas las variantes llevan el
     * mismo porcentaje y se redondean hacia arriba, así que el orden no cambia y la base puede
     * paginar sin calcular precios. :search llega en minúsculas, sin tildes y con comodines
     * (SearchText), igual que en el listado del ERP.
     */
    @Query(value = """
            SELECT p.id AS id, p.name AS name, c.id AS categoryId, c.name AS categoryName,
                   MIN(v.price) AS minPrice, MAX(v.price) AS maxPrice
            FROM Product p JOIN p.category c JOIN p.variants v
            WHERE p.company.id = :companyId
            AND p.active = true AND p.publishedOnline = true AND c.active = true AND v.active = true
            AND (:categoryId IS NULL OR c.id = :categoryId)
            AND (:hasSearch = false
                 OR CAST(FUNCTION('translate', LOWER(p.name),
                         'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE :search)
            GROUP BY p.id, p.name, c.id, c.name
            """,
            countQuery = """
            SELECT COUNT(p) FROM Product p JOIN p.category c
            WHERE p.company.id = :companyId
            AND p.active = true AND p.publishedOnline = true AND c.active = true
            AND EXISTS (SELECT 1 FROM ProductVariant v WHERE v.product = p AND v.active = true)
            AND (:categoryId IS NULL OR c.id = :categoryId)
            AND (:hasSearch = false
                 OR CAST(FUNCTION('translate', LOWER(p.name),
                         'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE :search)
            """)
    Page<ProductRow> findVisibleProducts(
            @Param("companyId") Long companyId,
            @Param("categoryId") Long categoryId,
            @Param("hasSearch") boolean hasSearch,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
            SELECT c FROM Category c
            WHERE c.company.id = :companyId AND c.active = true
            AND EXISTS (SELECT 1 FROM Product p JOIN p.variants v
                        WHERE p.category = c AND p.active = true AND p.publishedOnline = true
                        AND v.active = true)
            ORDER BY c.name ASC, c.id ASC
            """)
    List<Category> findVisibleCategories(@Param("companyId") Long companyId);

    @Query("""
            SELECT p FROM Product p JOIN FETCH p.category c
            WHERE p.id = :id AND p.company.id = :companyId
            AND p.active = true AND p.publishedOnline = true AND c.active = true
            AND EXISTS (SELECT 1 FROM ProductVariant v WHERE v.product = p AND v.active = true)
            """)
    Optional<Product> findVisibleProduct(@Param("id") Long id, @Param("companyId") Long companyId);

    @Query("""
            SELECT DISTINCT v FROM ProductVariant v
            LEFT JOIN FETCH v.attributes va
            LEFT JOIN FETCH va.attributeValue av
            LEFT JOIN FETCH av.attribute
            WHERE v.product.id = :productId AND v.active = true
            ORDER BY v.id ASC
            """)
    List<ProductVariant> findActiveVariantsWithAttributes(@Param("productId") Long productId);

    // Solo suman las sucursales activas que el dueño eligió para vender por la web.
    @Query("""
            SELECT v.product.id AS productId, v.id AS variantId,
                   COALESCE(SUM(CASE WHEN b.active = true AND b.storePriority IS NOT NULL THEN s.quantity ELSE 0 END), 0) AS quantity
            FROM ProductVariant v
            LEFT JOIN Stock s ON s.productVariant = v
            LEFT JOIN s.branch b
            WHERE v.product.id IN :productIds AND v.active = true
            GROUP BY v.product.id, v.id
            """)
    List<VariantStock> findActiveVariantStock(@Param("productIds") Collection<Long> productIds);

    @Query("""
            SELECT v.product.id AS productId, MIN(v.price) AS minPrice
            FROM ProductVariant v
            WHERE v.product.id IN :productIds AND v.active = true
            GROUP BY v.product.id
            """)
    List<ProductMinPrice> findActiveMinPrices(@Param("productIds") Collection<Long> productIds);

    /*
     * Promos vigentes hoy (mismo criterio que el estado ACTIVE del ERP) en las que todos los
     * productos son visibles con la regla del catálogo: si uno no se ve, la promo no se muestra.
     * Trae los ítems con su producto en la misma consulta.
     */
    @Query("""
            SELECT DISTINCT pr FROM Promotion pr
            JOIN FETCH pr.items i JOIN FETCH i.product
            WHERE pr.company.id = :companyId AND pr.active = true
            AND pr.startDate <= :today AND pr.endDate >= :today
            AND NOT EXISTS (
                SELECT 1 FROM PromotionItem hidden JOIN hidden.product p JOIN p.category c
                WHERE hidden.promotion = pr
                AND (p.active = false OR p.publishedOnline = false OR c.active = false
                     OR NOT EXISTS (SELECT 1 FROM ProductVariant v WHERE v.product = p AND v.active = true)))
            ORDER BY pr.endDate ASC, pr.name ASC, pr.id ASC
            """)
    List<Promotion> findVisiblePromotions(@Param("companyId") Long companyId, @Param("today") LocalDate today);
}
