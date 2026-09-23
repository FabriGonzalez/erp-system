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

    @Query("SELECT pv FROM ProductVariant pv LEFT JOIN FETCH pv.product LEFT JOIN FETCH pv.company WHERE pv.id = :id")
    Optional<ProductVariant> findByIdWithProductAndCompany(@Param("id") Long id);

    @Query("SELECT DISTINCT pv FROM ProductVariant pv " +
            "LEFT JOIN FETCH pv.attributes pva " +
            "LEFT JOIN FETCH pva.attributeValue av " +
            "LEFT JOIN FETCH av.attribute " +
            "WHERE pv.product.id IN :productIds")
    List<ProductVariant> findByProductIdInWithAttributes(@Param("productIds") Collection<Long> productIds);
}