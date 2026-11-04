package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findByProductIdOrderBySortOrderAscIdAsc(Long productId);

    List<ProductImage> findByVariantIdOrderBySortOrderAscIdAsc(Long variantId);

    /** Las del producto y las de todas sus variantes. */
    @Query("""
            select i from ProductImage i
            left join i.variant v
            where i.product.id = :productId or v.product.id = :productId
            order by i.sortOrder asc, i.id asc
            """)
    List<ProductImage> findAllOfProduct(@Param("productId") Long productId);

    /** Las que se ven en la tienda de varios productos: las propias y las de variantes activas. */
    @Query("""
            select i from ProductImage i
            left join fetch i.variant v
            where i.product.id in :productIds or (v.product.id in :productIds and v.active = true)
            order by i.sortOrder asc, i.id asc
            """)
    List<ProductImage> findVisibleOfProducts(@Param("productIds") Collection<Long> productIds);

    boolean existsByStorageKey(String storageKey);
}
