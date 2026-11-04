package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.store.dto.StoreCategoryResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductResponse;
import com.gonzalez.erp.modules.store.dto.StoreProductSummaryResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

/** Catálogo público de la tienda del request (CurrentStore). */
public interface StoreCatalogService {

    List<StoreCategoryResponse> findCategories();

    PageResponse<StoreProductSummaryResponse> findProducts(Long categoryId, String search, Pageable pageable);

    StoreProductResponse findProduct(Long id);
}
