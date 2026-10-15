package com.gonzalez.erp.modules.transfers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.transfers.dto.request.StockTransferRequest;
import com.gonzalez.erp.modules.transfers.dto.response.StockTransferResponse;
import org.springframework.data.domain.Pageable;

public interface StockTransferService {

    PageResponse<StockTransferResponse> findAll(Pageable pageable);

    StockTransferResponse findById(Long id);

    StockTransferResponse create(StockTransferRequest request);

    StockTransferResponse cancel(Long id);
}
