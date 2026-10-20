package com.gonzalez.erp.modules.products.dto.request;

/**
 * Filtros del listado de productos; todos opcionales. stock se mide en branchId o, sin
 * sucursal, en el total de la empresa.
 */
public record ProductSearchCriteria(
        Boolean active,
        Long categoryId,
        String query,
        ProductStockFilter stock,
        Long branchId
) {}
