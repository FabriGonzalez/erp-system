package com.gonzalez.erp.modules.imports.service;

import com.gonzalez.erp.common.util.SearchText;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Plantilla .xlsx: hoja "Productos" con los encabezados y hoja "Instrucciones". También define
 * cómo se llaman las columnas: el importador las reconoce desde acá (FixedColumn, isStockKey).
 */
final class ProductImportTemplate {

    /** El importador lee esta hoja; si no está, la primera. */
    static final String PRODUCTS_SHEET = "Productos";

    /** Columnas fijas, reconocidas sin distinguir mayúsculas ni tildes ("categoria" = "Categoría"). */
    enum FixedColumn {
        PRODUCT("Producto", "Nombre"),
        DESCRIPTION("Descripción"),
        CATEGORY("Categoría"),
        SKU("SKU"),
        BARCODE("Código de barras", "Código de barra"),
        PRICE("Precio");

        /** Como aparece en la plantilla. */
        final String header;
        /** El encabezado y sus otros nombres aceptados, normalizados. */
        private final Set<String> keys = new HashSet<>();

        FixedColumn(String header, String... otherNames) {
            this.header = header;
            keys.add(SearchText.normalize(header));
            Arrays.stream(otherNames).forEach(name -> keys.add(SearchText.normalize(name)));
        }

        /** La columna fija de un encabezado ya normalizado, o null si no es fija. */
        static FixedColumn ofKey(String key) {
            return Arrays.stream(values()).filter(column -> column.keys.contains(key)).findFirst().orElse(null);
        }
    }

    static final String STOCK_PREFIX = "Stock ";
    /** "stock": las columnas de stock son "stock" + el nombre de la sucursal, normalizados. */
    static final String STOCK_KEY = SearchText.normalize(STOCK_PREFIX);

    static boolean isStockKey(String key) {
        return key.equals(STOCK_KEY) || key.startsWith(STOCK_KEY + " ");
    }

    private static final String CREATE_TITLE = "Cómo completar la hoja Productos";
    private static final String UPDATE_TITLE = "Actualizar productos existentes (filas con un SKU que ya existe)";

    private static final List<String> INSTRUCTIONS = List.of(
            CREATE_TITLE,
            "",
            "• Una fila por variante. Las filas con el mismo Producto son variantes de un mismo producto nuevo.",
            "• Producto, Categoría y Precio son obligatorios para crear. La categoría que no exista se crea.",
            "• Precio: mayor a 0, con hasta 2 decimales (1500 o 1500,50).",
            "• SKU: opcional. Vacío, el sistema genera uno. Si ya existe, la fila actualiza esa variante.",
            "• Código de barras: opcional y único.",
            "• Cada columna que no sea de las fijas ni de stock es un atributo (Talle, Color…): el encabezado",
            "  es el atributo y la celda su valor. Un producto con varias filas necesita al menos un atributo",
            "  por fila. Los atributos y valores que no existan se crean.",
            "• Stock <sucursal>: la cantidad que queda en esa sucursal (no se suma a la actual). Vacío, no se toca.",
            "",
            UPDATE_TITLE,
            "",
            "• Cambian el precio, el código de barras y el stock. Vacío = no se toca.",
            "• Producto y los atributos tienen que coincidir con los de ese SKU; Descripción y Categoría se ignoran.",
            "",
            "Antes de guardar se muestra una vista previa con lo que va a pasar en cada fila. Si alguna",
            "tiene errores no se guarda nada: corregí el archivo y volvé a subirlo."
    );

    private ProductImportTemplate() {}

    static byte[] build(List<String> attributeNames, List<String> branchNames) {
        List<String> headers = new ArrayList<>();
        Arrays.stream(FixedColumn.values()).forEach(column -> headers.add(column.header));
        // Un atributo que se llame como una columna fija o empiece con "Stock" se leería como esa
        // columna; uno repetido (sin distinguir mayúsculas ni tildes) daría "columna repetida".
        Set<String> usedKeys = new HashSet<>();
        headers.forEach(header -> usedKeys.add(SearchText.normalize(header)));
        for (String attribute : attributeNames) {
            String key = SearchText.normalize(attribute);
            if (FixedColumn.ofKey(key) == null && !isStockKey(key) && usedKeys.add(key)) {
                headers.add(attribute);
            }
        }
        for (String branch : branchNames) {
            if (usedKeys.add(SearchText.normalize(STOCK_PREFIX + branch))) {
                headers.add(STOCK_PREFIX + branch);
            }
        }

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Font bold = workbook.createFont();
            bold.setBold(true);
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(bold);
            // SKU y código de barras como texto: si no, Excel muestra 7790001234567 como 7,79E+12.
            CellStyle textStyle = workbook.createCellStyle();
            textStyle.setDataFormat(workbook.createDataFormat().getFormat("@"));

            Sheet products = workbook.createSheet(PRODUCTS_SHEET);
            Row headerRow = products.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                String header = headers.get(i);
                headerRow.createCell(i).setCellValue(header);
                headerRow.getCell(i).setCellStyle(headerStyle);
                products.setColumnWidth(i, Math.max(14, header.length() + 4) * 256);
                if (header.equals(FixedColumn.SKU.header) || header.equals(FixedColumn.BARCODE.header)) {
                    products.setDefaultColumnStyle(i, textStyle);
                }
            }
            products.setColumnWidth(0, 30 * 256);
            products.setColumnWidth(1, 30 * 256);
            products.createFreezePane(0, 1);

            Sheet instructions = workbook.createSheet("Instrucciones");
            instructions.setColumnWidth(0, 110 * 256);
            for (int i = 0; i < INSTRUCTIONS.size(); i++) {
                String line = INSTRUCTIONS.get(i);
                instructions.createRow(i).createCell(0).setCellValue(line);
                if (line.equals(CREATE_TITLE) || line.equals(UPDATE_TITLE)) {
                    instructions.getRow(i).getCell(0).setCellStyle(headerStyle);
                }
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
