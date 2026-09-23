package com.gonzalez.erp.modules.products.mapper;

import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductVariantResponse;
import com.gonzalez.erp.modules.products.entity.Product;

import java.util.List;

public final class ProductMapper {

    private ProductMapper() {}

    public static ProductResponse toResponse(Product product, List<ProductVariantResponse> variantResponses) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.isActive(),
                variantResponses,
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}