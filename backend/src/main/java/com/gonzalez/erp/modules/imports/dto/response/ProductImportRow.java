package com.gonzalez.erp.modules.imports.dto.response;

import java.util.List;

/**
 * Resultado de una fila. Los textos ya vienen en español: son datos para mostrar, no errores de
 * la API (que se traducen en el frontend por code).
 *
 * @param row     número de fila como lo muestra Excel (los encabezados son la 1)
 * @param sku     el del archivo o, si vino vacío, el que se va a generar
 * @param changes en una actualización, qué cambia ("Precio: $1000 → $1200")
 */
public record ProductImportRow(
        int row,
        ProductImportAction action,
        String product,
        String sku,
        List<String> changes,
        List<String> errors,
        List<String> warnings
) {}
