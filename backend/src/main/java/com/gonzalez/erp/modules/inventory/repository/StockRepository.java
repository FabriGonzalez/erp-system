package com.gonzalez.erp.modules.inventory.repository;

import com.gonzalez.erp.modules.inventory.entity.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, Long> {

    Optional<Stock> findByProductVariantIdAndBranchId(Long productVariantId, Long branchId);

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