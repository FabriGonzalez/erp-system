package com.gonzalez.erp.modules.products.mapper;

import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductVariantResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductVariantStockResponse;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.entity.ProductVariantAttribute;
import com.gonzalez.erp.modules.inventory.entity.Stock;

import java.util.List;

public final class ProductVariantMapper {

    private ProductVariantMapper() {}

    public static ProductVariantResponse toResponse(ProductVariant variant) {
        return toResponse(variant, List.of());
    }

    public static ProductVariantResponse toResponse(
            ProductVariant variant,
            List<Stock> stocks
    ) {
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
                stocks.stream()
                        .map(stock -> new ProductVariantStockResponse(
                                stock.getBranch().getId(),
                                stock.getQuantity()
                        ))
                        .toList(),
                variant.getCreatedAt(),
                variant.getUpdatedAt()
        );
    }
}
