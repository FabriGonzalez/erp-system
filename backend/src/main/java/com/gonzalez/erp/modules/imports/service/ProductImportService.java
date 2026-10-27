package com.gonzalez.erp.modules.imports.service;

import com.gonzalez.erp.modules.imports.dto.response.ProductImportResult;

public interface ProductImportService {

    /** Plantilla .xlsx con los atributos y las sucursales activas de la empresa. */
    byte[] template();

    /** El catálogo activo en el formato de la plantilla: se edita y se vuelve a subir. */
    byte[] export();

    /** Lee y valida el archivo sin guardar nada. */
    ProductImportResult preview(String filename, byte[] content);

    /** Valida y, si no hay errores, guarda todo en una transacción (applied = true). */
    ProductImportResult importProducts(String filename, byte[] content);
}
