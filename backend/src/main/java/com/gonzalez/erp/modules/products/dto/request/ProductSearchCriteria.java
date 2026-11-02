package com.gonzalez.erp.modules.products.dto.request;

import java.util.List;

/**
 * Filtros del listado de productos; todos opcionales. stock se mide en branchId o, sin
 * sucursal, en el total de la empresa. attributeValueIds pide una misma variante que tenga, de
 * cada atributo involucrado, alguno de esos valores; con ese filtro, stock se mide solo sobre
 * las variantes que coinciden.
 */
public record ProductSearchCriteria(
        Boolean active,
        Long categoryId,
        String query,
        ProductStockFilter stock,
        Long branchId,
        List<Long> attributeValueIds
) {}
