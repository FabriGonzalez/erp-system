package com.gonzalez.erp.modules.transfers.repository;

import com.gonzalez.erp.modules.transfers.entity.StockTransferItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface StockTransferItemRepository extends JpaRepository<StockTransferItem, Long> {

    List<StockTransferItem> findByTransferId(Long transferId);

    // Ítems de una página de transferencias, con la variante y el producto que muestra la respuesta.
    @Query("""
            SELECT i FROM StockTransferItem i
            JOIN FETCH i.productVariant v
            JOIN FETCH v.product
            WHERE i.transfer.id IN :transferIds
            ORDER BY i.id ASC
            """)
    List<StockTransferItem> findByTransferIdInWithVariant(@Param("transferIds") Collection<Long> transferIds);
}
