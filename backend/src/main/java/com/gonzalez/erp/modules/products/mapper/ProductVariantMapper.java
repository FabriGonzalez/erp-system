package com.gonzalez.erp.modules.products.mapper;

import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductVariantResponse;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.entity.ProductVariantAttribute;

import java.util.List;

public final class ProductVariantMapper {

    private ProductVariantMapper() {}

    public static ProductVariantResponse toResponse(ProductVariant variant) {
        List<ProductVariantAttribute> attrs = variant.getAttributes() != null
                ? variant.getAttributes()
                : List.of();

        List<ProductAttributeValueResponse> attributeValues = attrs.stream()
                .map(a -> new ProductAttributeValueResponse(
                        a.getAttributeValue().getId(),
                        a.getAttributeValue().getAttribute().getId(),
                        a.getAttributeValue().getAttribute().getName(),
                        a.getAttributeValue().getValue(),
                        a.getAttributeValue().isActive(),
                        a.getAttributeValue().getCreatedAt(),
                        a.getAttributeValue().getUpdatedAt()
                ))
                .toList();

        return new ProductVariantResponse(
                variant.getId(),
                variant.getSku(),
                variant.getPrice(),
                variant.isActive(),
                attributeValues,
                variant.getCreatedAt(),
                variant.getUpdatedAt()
        );
    }
}
