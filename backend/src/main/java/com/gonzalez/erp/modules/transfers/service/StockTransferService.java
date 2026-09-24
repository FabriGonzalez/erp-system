package com.gonzalez.erp.modules.transfers.service;

import com.gonzalez.erp.modules.transfers.dto.request.StockTransferRequest;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import com.gonzalez.erp.modules.transfers.entity.StockTransferStatus;

import java.util.List;

public interface StockTransferService {

    List<StockTransferResponse> findAll();

    StockTransferResponse findById(Long id);

    StockTransferResponse create(StockTransferRequest request);

    StockTransferResponse cancel(Long id);
}
