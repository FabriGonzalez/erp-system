package com.gonzalez.erp.modules.inventory.repository;

import com.gonzalez.erp.modules.inventory.entity.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, Long> {

    Optional<Stock> findByProductVariantIdAndBranchId(Long productVariantId, Long branchId);

    /** Stock bajo (cantidad <= umbral) de productos y variantes activos, de menor a mayor. */
    @Query(value = """
            SELECT s FROM Stock s
            JOIN FETCH s.productVariant pv
            JOIN FETCH pv.product p
            JOIN FETCH s.branch b
            WHERE s.company.id = :companyId
            AND b.id IN :branchIds
            AND s.quantity <= :threshold
            AND pv.active = true AND p.active = true
            ORDER BY s.quantity ASC, s.id ASC
            """,
            countQuery = """
            SELECT COUNT(s) FROM Stock s
            JOIN s.productVariant pv
            JOIN pv.product p
            WHERE s.company.id = :companyId
            AND s.branch.id IN :branchIds
            AND s.quantity <= :threshold
            AND pv.active = true AND p.active = true
            """)
    Page<Stock> findLowStock(
            @Param("companyId") Long companyId,
            @Param("branchIds") Collection<Long> branchIds,
            @Param("threshold") int threshold,
            Pageable pageable
    );

    boolean existsByProductVariantIdAndBranchId(Long productVariantId, Long branchId);

    List<Stock> findByBranchId(Long branchId);

    List<Stock> findByProductVariantId(Long productVariantId);

    List<Stock> findByCompanyId(Long companyId);

        @Query("SELECT s FROM Stock s " +
            "JOIN FETCH s.productVariant pv " +
            "JOIN FETCH pv.product " +
            "JOIN FETCH s.branch " +
            "JOIN FETCH s.company c " +
            "WHERE c.id = :companyId")
        List<Stock> findAllByCompanyId(@Param("companyId") Long companyId);

        @Query("SELECT s FROM Stock s " +
            "JOIN FETCH s.productVariant pv " +
            "JOIN FETCH pv.product " +
            "JOIN FETCH s.branch " +
            "JOIN FETCH s.company c " +
            "WHERE s.id = :id AND c.id = :companyId")
        Optional<Stock> findByIdAndCompanyId(@Param("id") Long id, @Param("companyId") Long companyId);

        @Query("SELECT s FROM Stock s " +
            "JOIN FETCH s.productVariant pv " +
            "JOIN FETCH pv.product " +
            "JOIN FETCH s.branch " +
            "JOIN FETCH s.company c " +
            "WHERE pv.id = :variantId AND c.id = :companyId")
        List<Stock> findByProductVariantIdAndCompanyId(
            @Param("variantId") Long variantId, @Param("companyId") Long companyId);

        @Query("SELECT s FROM Stock s " +
            "JOIN FETCH s.productVariant pv " +
            "JOIN FETCH pv.product " +
            "JOIN FETCH s.branch " +
            "JOIN FETCH s.company c " +
            "WHERE s.branch.id = :branchId AND c.id = :companyId")
        List<Stock> findByBranchIdAndCompanyId(
            @Param("branchId") Long branchId, @Param("companyId") Long companyId);

            @Query("SELECT s FROM Stock s " +
                "JOIN FETCH s.productVariant pv " +
                "JOIN FETCH pv.product " +
                "JOIN FETCH s.branch " +
                "JOIN FETCH s.company c " +
                "WHERE pv.id = :variantId AND s.branch.id = :branchId AND c.id = :companyId")
            Optional<Stock> findByProductVariantIdAndBranchIdAndCompanyId(
                @Param("variantId") Long variantId,
                @Param("branchId") Long branchId,
                @Param("companyId") Long companyId);

        @Modifying
        @Query(value = """
            INSERT INTO stocks (
                id,
                product_variant_id,
                branch_id,
                company_id,
                quantity,
                created_at,
                updated_at
            )
            VALUES (
                nextval('stocks_seq'),
                :variantId,
                :branchId,
                :companyId,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (product_variant_id, branch_id) DO NOTHING
            """, nativeQuery = true)
        int insertIfAbsent(
            @Param("variantId") Long variantId,
            @Param("branchId") Long branchId,
            @Param("companyId") Long companyId
        );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Stock s WHERE s.productVariant.id = :variantId AND s.branch.id = :branchId")
    Optional<Stock> findByProductVariantIdAndBranchIdForUpdate(@Param("variantId") Long variantId, @Param("branchId") Long branchId);

        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT s FROM Stock s " +
            "JOIN FETCH s.productVariant pv " +
            "JOIN FETCH pv.product " +
            "JOIN FETCH s.branch " +
            "JOIN FETCH s.company c " +
            "WHERE pv.id = :variantId AND s.branch.id = :branchId AND c.id = :companyId")
        Optional<Stock> findByProductVariantIdAndBranchIdForUpdate(
            @Param("variantId") Long variantId,
            @Param("branchId") Long branchId,
            @Param("companyId") Long companyId);
}