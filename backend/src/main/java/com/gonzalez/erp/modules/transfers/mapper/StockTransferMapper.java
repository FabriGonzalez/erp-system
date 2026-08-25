package com.gonzalez.erp.modules.transfers.mapper;

import com.gonzalez.erp.modules.transfers.dto.response.StockTransferItemResponse;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import com.gonzalez.erp.modules.transfers.entity.StockTransfer;
import com.gonzalez.erp.modules.transfers.entity.StockTransferItem;

public final class StockTransferMapper {

    private StockTransferMapper() {}

    public static StockTransferResponse toResponse(StockTransfer transfer) {
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
                transfer.getItems().stream()
                        .map(StockTransferMapper::toItemResponse)
                        .toList(),
                transfer.getCreatedAt(),
                transfer.getUpdatedAt()
        );
    }

    private static StockTransferItemResponse toItemResponse(StockTransferItem item) {
        return new StockTransferItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity()
        );
    }
}
