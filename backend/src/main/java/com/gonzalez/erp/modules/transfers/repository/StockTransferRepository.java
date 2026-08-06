package com.gonzalez.erp.modules.transfers.repository;

import com.gonzalez.erp.modules.transfers.entity.StockTransfer;
import com.gonzalez.erp.modules.transfers.entity.StockTransferStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {

    List<StockTransfer> findByStatus(StockTransferStatus status);
}
