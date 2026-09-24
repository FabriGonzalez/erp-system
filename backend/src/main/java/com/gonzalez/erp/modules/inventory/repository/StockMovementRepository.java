package com.gonzalez.erp.modules.inventory.repository;

import com.gonzalez.erp.modules.inventory.entity.StockMovement;
import com.gonzalez.erp.modules.inventory.entity.StockMovementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByStockIdOrderByCreatedAtDesc(Long stockId);

    List<StockMovement> findByType(StockMovementType type);

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
            "WHERE s.company.id = :companyId " +
            "ORDER BY m.createdAt DESC")
        List<StockMovement> findAllByCompanyId(@Param("companyId") Long companyId);

        @Query("SELECT m FROM StockMovement m " +
            "JOIN FETCH m.stock s " +
            "WHERE m.id = :id AND s.company.id = :companyId")
        Optional<StockMovement> findByIdAndCompanyId(
            @Param("id") Long id, @Param("companyId") Long companyId);

        @Query("SELECT m FROM StockMovement m " +
            "JOIN FETCH m.stock s " +
            "WHERE s.id = :stockId AND s.company.id = :companyId " +
            "ORDER BY m.createdAt DESC")
        List<StockMovement> findByStockIdAndCompanyId(
            @Param("stockId") Long stockId, @Param("companyId") Long companyId);

        @Query("SELECT m FROM StockMovement m " +
            "JOIN FETCH m.stock s " +
            "WHERE m.type = :type AND s.company.id = :companyId " +
            "ORDER BY m.createdAt DESC")
        List<StockMovement> findByTypeAndCompanyId(
            @Param("type") StockMovementType type, @Param("companyId") Long companyId);
}