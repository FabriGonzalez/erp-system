package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.modules.products.dto.request.ProductAttributeRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeValueRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;

import java.util.List;

public interface ProductAttributeService {

    List<ProductAttributeResponse> findAll(Boolean active);

    ProductAttributeResponse findById(Long id);

    ProductAttributeResponse create(ProductAttributeRequest request);

    ProductAttributeResponse update(Long id, ProductAttributeRequest request);

    ProductAttributeResponse deactivate(Long id);

    ProductAttributeResponse activate(Long id);

    ProductAttributeValueResponse addValue(Long attributeId, ProductAttributeValueRequest request);

    ProductAttributeValueResponse updateValue(Long valueId, ProductAttributeValueRequest request);

    ProductAttributeValueResponse deactivateValue(Long valueId);

    ProductAttributeValueResponse activateValue(Long valueId);
}
