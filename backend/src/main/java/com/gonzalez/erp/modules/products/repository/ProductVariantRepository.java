package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    List<ProductVariant> findByProductId(Long productId);

    boolean existsBySkuAndCompanyId(String sku, Long companyId);

    boolean existsBySkuAndCompanyIdAndIdNot(String sku, Long companyId, Long id);

    /**
     * El SKU base y los que le suman un sufijo ("SKU-RE-M", "SKU-RE-M-2"…), activos o no: la
     * unicidad también cuenta las inactivas. :base solo trae letras, números y guiones.
     */
    @Query("SELECT pv.sku FROM ProductVariant pv WHERE pv.company.id = :companyId " +
            "AND (pv.sku = :base OR pv.sku LIKE CONCAT(:base, '-%'))")
    List<String> findSkusWithBase(@Param("companyId") Long companyId, @Param("base") String base);

    boolean existsByBarcodeAndCompanyId(String barcode, Long companyId);

    boolean existsByBarcodeAndCompanyIdAndIdNot(String barcode, Long companyId, Long id);

    /** Variantes activas de varios productos (precios de las promos). */
    List<ProductVariant> findByProductIdInAndActiveTrue(Collection<Long> productIds);

    @Query("SELECT pv FROM ProductVariant pv LEFT JOIN FETCH pv.product LEFT JOIN FETCH pv.company WHERE pv.id = :id")
    Optional<ProductVariant> findByIdWithProductAndCompany(@Param("id") Long id);

    @Query("SELECT DISTINCT pv FROM ProductVariant pv " +
            "LEFT JOIN FETCH pv.attributes pva " +
            "LEFT JOIN FETCH pva.attributeValue av " +
            "LEFT JOIN FETCH av.attribute " +
            "WHERE pv.product.id IN :productIds")
    List<ProductVariant> findByProductIdInWithAttributes(@Param("productIds") Collection<Long> productIds);

    /** Todos los SKU de la empresa, activos o no (la importación genera los que faltan). */
    @Query("SELECT pv.sku FROM ProductVariant pv WHERE pv.company.id = :companyId")
    List<String> findSkusByCompanyId(@Param("companyId") Long companyId);

    /** Variantes de la empresa por SKU sin distinguir mayúsculas; :skus en mayúsculas. */
    @Query("SELECT DISTINCT pv FROM ProductVariant pv " +
            "JOIN FETCH pv.product p " +
            "JOIN FETCH p.category " +
            "LEFT JOIN FETCH pv.attributes pva " +
            "LEFT JOIN FETCH pva.attributeValue av " +
            "LEFT JOIN FETCH av.attribute " +
            "WHERE pv.company.id = :companyId AND UPPER(pv.sku) IN :skus")
    List<ProductVariant> findByCompanyIdAndUpperSkuIn(
            @Param("companyId") Long companyId,
            @Param("skus") Collection<String> skus
    );

    List<ProductVariant> findByCompanyIdAndBarcodeIn(Long companyId, Collection<String> barcodes);

    /** Variantes activas de productos activos, con producto, categoría y atributos (exportar). */
    @Query("SELECT DISTINCT pv FROM ProductVariant pv " +
            "JOIN FETCH pv.product p " +
            "JOIN FETCH p.category " +
            "LEFT JOIN FETCH pv.attributes pva " +
            "LEFT JOIN FETCH pva.attributeValue av " +
            "LEFT JOIN FETCH av.attribute " +
            "WHERE pv.company.id = :companyId AND pv.active = true AND p.active = true")
    List<ProductVariant> findActiveForExport(@Param("companyId") Long companyId);
}