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
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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

    /**
     * Una variante del catálogo exportado. attributes: clave normalizada del atributo → valor;
     * stock: clave normalizada de la sucursal → cantidad.
     */
    record CatalogRow(String product, String description, String category, String sku, String barcode,
                      BigDecimal price, Map<String, String> attributes, Map<String, Integer> stock) {}

    /** Una columna: fija, de atributo o de stock (con la clave normalizada del atributo o la sucursal). */
    private record Column(String header, FixedColumn fixed, String attributeKey, String branchKey) {}

    /** La plantilla vacía. */
    static byte[] build(List<String> attributeNames, List<String> branchNames) {
        return build(attributeNames, branchNames, List.of());
    }

    /** Con filas es el catálogo exportado: se puede editar y volver a subir. */
    static byte[] build(List<String> attributeNames, List<String> branchNames, List<CatalogRow> rows) {
        List<Column> columns = new ArrayList<>();
        Arrays.stream(FixedColumn.values()).forEach(column -> columns.add(new Column(column.header, column, null, null)));
        // Un atributo que se llame como una columna fija o empiece con "Stock" se leería como esa
        // columna; uno repetido (sin distinguir mayúsculas ni tildes) daría "columna repetida".
        Set<String> usedKeys = new HashSet<>();
        columns.forEach(column -> usedKeys.add(SearchText.normalize(column.header())));
        for (String attribute : attributeNames) {
            String key = SearchText.normalize(attribute);
            if (FixedColumn.ofKey(key) == null && !isStockKey(key) && usedKeys.add(key)) {
                columns.add(new Column(attribute, null, key, null));
            }
        }
        for (String branch : branchNames) {
            if (usedKeys.add(SearchText.normalize(STOCK_PREFIX + branch))) {
                columns.add(new Column(STOCK_PREFIX + branch, null, null, SearchText.normalize(branch)));
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
            for (int i = 0; i < columns.size(); i++) {
                Column column = columns.get(i);
                headerRow.createCell(i).setCellValue(column.header());
                headerRow.getCell(i).setCellStyle(headerStyle);
                products.setColumnWidth(i, Math.max(14, column.header().length() + 4) * 256);
                if (isText(column)) {
                    products.setDefaultColumnStyle(i, textStyle);
                }
            }
            products.setColumnWidth(0, 30 * 256);
            products.setColumnWidth(1, 30 * 256);
            products.createFreezePane(0, 1);

            for (int r = 0; r < rows.size(); r++) {
                writeRow(products.createRow(r + 1), columns, rows.get(r), textStyle);
            }

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

    private static boolean isText(Column column) {
        return column.fixed() == FixedColumn.SKU || column.fixed() == FixedColumn.BARCODE;
    }

    /** Precio y stock como números (el importador los lee sin interpretar separadores); el resto, texto. */
    private static void writeRow(Row row, List<Column> columns, CatalogRow data, CellStyle textStyle) {
        for (int i = 0; i < columns.size(); i++) {
            Column column = columns.get(i);
            if (column.branchKey() != null) {
                row.createCell(i).setCellValue(data.stock().getOrDefault(column.branchKey(), 0));
                continue;
            }
            if (column.fixed() == FixedColumn.PRICE) {
                row.createCell(i).setCellValue(data.price().doubleValue());
                continue;
            }
            String value = column.attributeKey() != null
                    ? data.attributes().get(column.attributeKey())
                    : switch (column.fixed()) {
                        case PRODUCT -> data.product();
                        case DESCRIPTION -> data.description();
                        case CATEGORY -> data.category();
                        case SKU -> data.sku();
                        case BARCODE -> data.barcode();
                        case PRICE -> null;
                    };
            if (value != null) {
                row.createCell(i).setCellValue(value);
                if (isText(column)) {
                    row.getCell(i).setCellStyle(textStyle);
                }
            }
        }
    }
}
