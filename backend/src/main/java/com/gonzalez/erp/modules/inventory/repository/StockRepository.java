package com.gonzalez.erp.modules.inventory.repository;

import com.gonzalez.erp.modules.inventory.entity.Stock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Stock s WHERE s.productVariant.id = :variantId AND s.branch.id = :branchId")
    Optional<Stock> findByProductVariantIdAndBranchIdForUpdate(@Param("variantId") Long variantId, @Param("branchId") Long branchId);
}