package com.gonzalez.erp.modules.transfers.repository;

import com.gonzalez.erp.modules.transfers.entity.StockTransfer;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {

    @Query("SELECT t FROM StockTransfer t WHERE t.company.id = :companyId")
    List<StockTransfer> findAllByCompanyId(
        @Param("companyId") Long companyId
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
