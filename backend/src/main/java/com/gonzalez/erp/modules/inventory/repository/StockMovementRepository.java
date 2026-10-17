package com.gonzalez.erp.modules.inventory.repository;

import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

        @Query("SELECT m FROM StockMovement m "
            + "JOIN FETCH m.stock s "
            + "WHERE m.referenceId = :referenceId "
            + "AND m.referenceType = :referenceType "
            + "AND s.company.id = :companyId")
        List<StockMovement> findByReferenceAndCompanyId(
            @Param("referenceId") Long referenceId,
            @Param("referenceType") String referenceType,
            @Param("companyId") Long companyId);

        @Query("SELECT m FROM StockMovement m " +
            "JOIN FETCH m.stock s " +
            "JOIN FETCH s.productVariant v " +
            "JOIN FETCH v.product " +
            "JOIN FETCH s.branch " +
            "LEFT JOIN FETCH m.createdBy " +
            "WHERE m.id = :id AND s.company.id = :companyId")
        Optional<StockMovement> findByIdAndCompanyId(
            @Param("id") Long id, @Param("companyId") Long companyId);

        /**
         * Filtros opcionales (null = sin filtrar). Solo se traen relaciones a uno, así la
         * paginación se resuelve en la base; el orden lo define el Pageable.
         */
        @Query(value = """
                SELECT m FROM StockMovement m
                JOIN FETCH m.stock s
                JOIN FETCH s.productVariant v
                JOIN FETCH v.product
                JOIN FETCH s.branch b
                LEFT JOIN FETCH m.createdBy
                WHERE s.company.id = :companyId
                AND (:stockId IS NULL OR s.id = :stockId)
                AND (:branchId IS NULL OR b.id = :branchId)
                AND (:productVariantId IS NULL OR v.id = :productVariantId)
                AND (:type IS NULL OR m.type = :type)
                """,
            countQuery = """
                SELECT COUNT(m) FROM StockMovement m
                JOIN m.stock s
                WHERE s.company.id = :companyId
                AND (:stockId IS NULL OR s.id = :stockId)
                AND (:branchId IS NULL OR s.branch.id = :branchId)
                AND (:productVariantId IS NULL OR s.productVariant.id = :productVariantId)
                AND (:type IS NULL OR m.type = :type)
                """)
        Page<StockMovement> search(
            @Param("companyId") Long companyId,
            @Param("stockId") Long stockId,
            @Param("branchId") Long branchId,
            @Param("productVariantId") Long productVariantId,
            @Param("type") StockMovementType type,
            Pageable pageable);
}
