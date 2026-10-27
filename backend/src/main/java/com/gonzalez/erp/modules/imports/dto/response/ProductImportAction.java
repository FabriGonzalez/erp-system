package com.gonzalez.erp.modules.imports.dto.response;

/** Qué hace la importación con una fila. */
public enum ProductImportAction {
    /** Variante nueva (de un producto nuevo). */
    CREATE,
    /** SKU existente al que le cambia precio, código de barras o stock. */
    UPDATE,
    /** SKU existente que queda igual. */
    UNCHANGED,
    /** La fila tiene errores: no se importa nada hasta corregirla. */
    ERROR
}
