package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Listado paginado. :search busca en el nombre del producto o en el SKU o el código de
     * barras de alguna variante,
     * sin distinguir mayúsculas ni tildes; llega en minúsculas, sin tildes y con los comodines
     * (ProductServiceImpl.normalizeSearch). El stock se suma en :branchId o, sin sucursal, en
     * toda la empresa (las mismas sucursales que trae la respuesta del producto).
     * La respuesta usa el nombre de la categoría: se trae en la misma consulta.
     */
    @EntityGraph(attributePaths = "category")
    @Query(value = """
            SELECT p FROM Product p
            WHERE p.company.id = :companyId
            AND (:active IS NULL OR p.active = :active)
            AND (:categoryId IS NULL OR p.category.id = :categoryId)
            AND (:hasSearch = false
                 OR CAST(FUNCTION('translate', LOWER(p.name),
                         'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE :search
                 OR EXISTS (SELECT 1 FROM ProductVariant v
                            WHERE v.product = p
                            AND (LOWER(v.sku) LIKE :search OR LOWER(v.barcode) LIKE :search)))
            AND (:onlyInStock = false
                 OR (SELECT COALESCE(SUM(s.quantity), 0) FROM Stock s
                     WHERE s.productVariant.product = p
                     AND (:branchId IS NULL OR s.branch.id = :branchId)) > 0)
            AND (:onlyOutOfStock = false
                 OR (SELECT COALESCE(SUM(s.quantity), 0) FROM Stock s
                     WHERE s.productVariant.product = p
                     AND (:branchId IS NULL OR s.branch.id = :branchId)) <= 0)
            """,
            countQuery = """
            SELECT COUNT(p) FROM Product p
            WHERE p.company.id = :companyId
            AND (:active IS NULL OR p.active = :active)
            AND (:categoryId IS NULL OR p.category.id = :categoryId)
            AND (:hasSearch = false
                 OR CAST(FUNCTION('translate', LOWER(p.name),
                         'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE :search
                 OR EXISTS (SELECT 1 FROM ProductVariant v
                            WHERE v.product = p
                            AND (LOWER(v.sku) LIKE :search OR LOWER(v.barcode) LIKE :search)))
            AND (:onlyInStock = false
                 OR (SELECT COALESCE(SUM(s.quantity), 0) FROM Stock s
                     WHERE s.productVariant.product = p
                     AND (:branchId IS NULL OR s.branch.id = :branchId)) > 0)
            AND (:onlyOutOfStock = false
                 OR (SELECT COALESCE(SUM(s.quantity), 0) FROM Stock s
                     WHERE s.productVariant.product = p
                     AND (:branchId IS NULL OR s.branch.id = :branchId)) <= 0)
            """)
    Page<Product> search(
            @Param("companyId") Long companyId,
            @Param("active") Boolean active,
            @Param("categoryId") Long categoryId,
            @Param("hasSearch") boolean hasSearch,
            @Param("search") String search,
            @Param("onlyInStock") boolean onlyInStock,
            @Param("onlyOutOfStock") boolean onlyOutOfStock,
            @Param("branchId") Long branchId,
            Pageable pageable
    );

    Optional<Product> findByIdAndCompanyId(Long id, Long companyId);
}
