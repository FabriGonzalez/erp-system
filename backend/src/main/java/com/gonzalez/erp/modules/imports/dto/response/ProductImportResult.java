package com.gonzalez.erp.modules.imports.dto.response;

import java.util.List;

/**
 * Previsualización o resultado de una importación de productos.
 *
 * @param valid      sin errores de archivo ni de filas: se puede confirmar
 * @param applied    true solo si se guardó (confirmación sin errores)
 * @param fileErrors problemas del archivo entero (formato, columnas); con alguno no hay filas
 */
public record ProductImportResult(
        boolean valid,
        boolean applied,
        int rowsRead,
        int productsToCreate,
        int variantsToCreate,
        int variantsToUpdate,
        int variantsUnchanged,
        int rowsWithErrors,
        List<String> categoriesToCreate,
        List<String> attributesToCreate,
        List<String> fileErrors,
        List<ProductImportRow> rows
) {}
