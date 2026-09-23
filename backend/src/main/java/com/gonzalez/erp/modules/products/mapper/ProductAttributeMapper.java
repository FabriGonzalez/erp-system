package com.gonzalez.erp.modules.products.mapper;

import com.gonzalez.erp.modules.products.dto.response.ProductAttributeResponse;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;

public final class ProductAttributeMapper {

    private ProductAttributeMapper() {}

    public static ProductAttributeResponse toResponse(ProductAttribute attribute) {
        return new ProductAttributeResponse(
                attribute.getId(),
                attribute.getName(),
                attribute.isActive(),
                attribute.getCreatedAt(),
                attribute.getUpdatedAt()
        );
    }
}
