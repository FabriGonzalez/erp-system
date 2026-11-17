package com.gonzalez.erp.modules.transfers.repository;

import com.gonzalez.erp.modules.transfers.entity.StockTransfer;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;

public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {

    // Las relaciones a uno se traen en la misma consulta; los ítems, aparte y por página.
    // Una transferencia se ve si el origen o el destino es una sucursal accesible.
    @EntityGraph(attributePaths = {"originBranch", "destinationBranch", "createdBy"})
    @Query(value = """
            SELECT t FROM StockTransfer t
            WHERE t.company.id = :companyId
            AND (t.originBranch.id IN :branchIds OR t.destinationBranch.id IN :branchIds)
            """,
        countQuery = """
            SELECT COUNT(t) FROM StockTransfer t
            WHERE t.company.id = :companyId
            AND (t.originBranch.id IN :branchIds OR t.destinationBranch.id IN :branchIds)
            """)
    Page<StockTransfer> findAllByCompanyIdAndBranchIds(
        @Param("companyId") Long companyId,
        @Param("branchIds") Collection<Long> branchIds,
        Pageable pageable
    );

    @Query("SELECT t FROM StockTransfer t " +
        "WHERE t.id = :id AND t.company.id = :companyId")
    Optional<StockTransfer> findByIdAndCompanyId(
        @Param("id") Long id,
        @Param("companyId") Long companyId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM StockTransfer t " +
        "WHERE t.id = :id AND t.company.id = :companyId")
    Optional<StockTransfer> findByIdAndCompanyIdForUpdate(
        @Param("id") Long id,
        @Param("companyId") Long companyId
    );
}
