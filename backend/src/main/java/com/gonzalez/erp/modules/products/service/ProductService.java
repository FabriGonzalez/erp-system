package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;

import java.util.List;

public interface ProductService {

    List<ProductResponse> findAll(Boolean active);

    ProductResponse findById(Long id);

    ProductResponse create(ProductRequest request);

    ProductResponse update(Long id, ProductUpdateRequest request);

    ProductResponse deactivate(Long id);

    ProductResponse activate(Long id);
}
