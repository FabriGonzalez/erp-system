package com.gonzalez.erp.modules.products.mapper;

import com.gonzalez.erp.modules.products.dto.ColorSwatch;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;

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

    public static ProductAttributeValueResponse toValueResponse(ProductAttributeValue value) {
        return new ProductAttributeValueResponse(
                value.getId(),
                value.getAttribute().getId(),
                value.getAttribute().getName(),
                value.getValue(),
                ColorSwatch.fromColumn(value.getSwatchColors()),
                value.isActive(),
                value.getCreatedAt(),
                value.getUpdatedAt()
        );
    }
}
