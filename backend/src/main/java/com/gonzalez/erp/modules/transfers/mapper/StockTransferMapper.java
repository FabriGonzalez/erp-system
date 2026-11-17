package com.gonzalez.erp.modules.transfers.mapper;

import com.gonzalez.erp.modules.transfers.dto.response.StockTransferItemResponse;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import com.gonzalez.erp.modules.transfers.entity.StockTransfer;
import com.gonzalez.erp.modules.transfers.entity.StockTransferItem;

import java.util.List;

public final class StockTransferMapper {

    private StockTransferMapper() {}

    public static StockTransferResponse toResponse(StockTransfer transfer) {
        return toResponse(transfer, transfer.getItems());
    }

    /** Con los ítems ya cargados aparte (listado paginado), para no recorrer la colección lazy. */
    public static StockTransferResponse toResponse(StockTransfer transfer, List<StockTransferItem> items) {
        return new StockTransferResponse(
                transfer.getId(),
                transfer.getOriginBranch().getId(),
                transfer.getOriginBranch().getName(),
                transfer.getDestinationBranch().getId(),
                transfer.getDestinationBranch().getName(),
                transfer.getStatus(),
                transfer.getCreatedBy().getId(),
                transfer.getCreatedBy().getUsername(),
                transfer.getConfirmedAt(),
                items.stream()
                        .map(StockTransferMapper::toItemResponse)
                        .toList(),
                transfer.getCreatedAt(),
                transfer.getUpdatedAt()
        );
    }

    private static StockTransferItemResponse toItemResponse(StockTransferItem item) {
        return new StockTransferItemResponse(
                item.getId(),
                item.getProductVariant().getProduct().getId(),
                item.getProductVariant().getProduct().getName(),
                item.getProductVariant().getId(),
                item.getProductVariant().getSku(),
                item.getQuantity()
        );
    }
}
