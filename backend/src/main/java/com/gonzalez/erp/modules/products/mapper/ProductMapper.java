package com.gonzalez.erp.modules.products.mapper;

import com.gonzalez.erp.modules.products.dto.response.ProductResponse;
import com.gonzalez.erp.modules.products.entity.Product;

public final class ProductMapper {

    private ProductMapper() {}

    public static ProductResponse toResponse(Product product) {
        return new ProductResponse(
                product.getSku(),
                product.getName(),
                product.getColor(),
                product.getTalle(),
                product.getDescription(),
                product.getPrice(),
                product.getCategory().getId(),
                product.getCategory().getName(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
    }
}
