package com.gonzalez.erp.modules.imports.service;

import com.gonzalez.erp.modules.imports.service.SpreadsheetReader.SheetCell;
import com.gonzalez.erp.modules.imports.service.SpreadsheetReader.SheetData;
import com.gonzalez.erp.modules.imports.service.SpreadsheetReader.UnreadableFileException;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SpreadsheetReaderTest {

    @Test
    void theProductsSheetIsReadEvenIfItIsNotTheFirst() throws Exception {
        byte[] file;
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.createSheet("Instrucciones").createRow(0).createCell(0).setCellValue("Cómo completar");
            workbook.createSheet("productos").createRow(0).createCell(0).setCellValue("Producto");
            workbook.write(out);
            file = out.toByteArray();
        }

        assertThat(SpreadsheetReader.read("p.xlsx", file, "Productos", 10).headers()).containsExactly("Producto");
        // Sin una hoja con ese nombre (un Excel propio), la primera.
        assertThat(SpreadsheetReader.read("p.xlsx", file, "Otra", 10).headers()).containsExactly("Cómo completar");
    }

    @Test
    void theTemplateSkipsAttributesThatWouldCollideWithOtherColumns() throws Exception {
        byte[] template = ProductImportTemplate.build(
                List.of("Color", "Precio", "color", "Stock viejo", "Talle"), List.of("Centro", "centro"));

        assertThat(SpreadsheetReader.read("plantilla.xlsx", template, "Productos", 10).headers()).containsExactly(
                "Producto", "Descripción", "Categoría", "SKU", "Código de barras", "Precio",
                "Color", "Talle", "Stock Centro");
    }

    @Test
    void anExcelNumberIsReadWithoutExponentNorThousandsSeparators() throws Exception {
        byte[] file;
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Productos");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Producto");
            header.createCell(1).setCellValue("Código de barras");
            header.createCell(2).setCellValue("Precio");
            Row row = sheet.createRow(1);
            row.createCell(0).setCellValue("Buzo");
            row.createCell(1).setCellValue(7790001234567d);
            row.createCell(2).setCellValue(1500.5);
            sheet.createRow(2);
            workbook.write(out);
            file = out.toByteArray();
        }

        SheetData data = SpreadsheetReader.read("productos.xlsx", file, "Productos", 10);

        assertThat(data.headers()).containsExactly("Producto", "Código de barras", "Precio");
        assertThat(data.rows()).hasSize(1);
        assertThat(data.rows().getFirst().cells()).containsExactly(
                new SheetCell("Buzo", false), new SheetCell("7790001234567", true), new SheetCell("1500.5", true));
    }

    @Test
    void aCsvFromExcelInSpanishUsesSemicolonsQuotesAndWindows1252() throws Exception {
        byte[] file = "Producto;Descripción\r\n\"Buzo; con capucha\";\"Dice \"\"hola\"\"\"\r\n;\r\n"
                .getBytes(Charset.forName("windows-1252"));

        SheetData data = SpreadsheetReader.read("productos.csv", file, "Productos", 10);

        assertThat(data.headers()).containsExactly("Producto", "Descripción");
        assertThat(data.rows()).hasSize(1);
        assertThat(data.rows().getFirst().number()).isEqualTo(2);
        assertThat(data.rows().getFirst().cells()).extracting(SheetCell::text)
                .containsExactly("Buzo; con capucha", "Dice \"hola\"");
    }

    @Test
    void moreRowsThanTheLimitIsAnError() {
        byte[] file = "Producto\nA\nB\nC\n".getBytes();

        assertThatThrownBy(() -> SpreadsheetReader.read("p.csv", file, "Productos", 2))
                .isInstanceOf(UnreadableFileException.class)
                .hasMessageContaining("más de 2 filas");
    }

    @Test
    void anotherFormatIsRejected() {
        assertThatThrownBy(() -> SpreadsheetReader.read("foto.png", new byte[] {1, 2, 3}, "Productos", 10))
                .isInstanceOf(UnreadableFileException.class);
        assertThat(SpreadsheetReader.parseCsv("a,b\n", ',')).isEqualTo(List.of(List.of("a", "b")));
    }
}
