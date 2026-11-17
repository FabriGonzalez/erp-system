package com.gonzalez.erp.modules.promotions.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.promotions.dto.request.PromotionRequest;
import com.gonzalez.erp.modules.promotions.dto.response.PromotionResponse;
import com.gonzalez.erp.modules.promotions.entity.PromotionStatus;
import org.springframework.data.domain.Pageable;

public interface PromotionService {

    PageResponse<PromotionResponse> findAll(String query, PromotionStatus status, Pageable pageable);

    PromotionResponse findById(Long id);

    PromotionResponse create(PromotionRequest request);

    PromotionResponse update(Long id, PromotionRequest request);

    PromotionResponse activate(Long id);

    PromotionResponse deactivate(Long id);
}
