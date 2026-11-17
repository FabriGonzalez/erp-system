package com.gonzalez.erp.modules.products.dto.request;

/**
 * Filtro de stock del listado de productos: suma de las variantes en la sucursal o en la empresa.
 * SELLABLE es "con stock" contando solo las variantes activas: lo que ofrece el catálogo de ventas.
 */
public enum ProductStockFilter {
    IN_STOCK,
    OUT_OF_STOCK,
    SELLABLE
}
