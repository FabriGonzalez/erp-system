package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductResponse;

import java.util.List;

public interface ProductService {

    List<ProductResponse> findAll(Boolean active);

    ProductResponse findById(String sku);

    ProductResponse create(ProductRequest request);

    ProductResponse update(String sku, ProductUpdateRequest request);

    ProductResponse deactivate(String sku);

    ProductResponse activate(String sku);
}
