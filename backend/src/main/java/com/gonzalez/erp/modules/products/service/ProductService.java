package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductSearchCriteria;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import org.springframework.data.domain.Pageable;

public interface ProductService {

    PageResponse<ProductResponse> findAll(ProductSearchCriteria criteria, Pageable pageable);

    ProductResponse findById(Long id);

    ProductResponse create(ProductRequest request);

    ProductResponse update(Long id, ProductUpdateRequest request);

    ProductResponse deactivate(Long id);

    ProductResponse activate(Long id);
}
