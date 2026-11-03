package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    boolean existsByStorageKey(String storageKey);
}
