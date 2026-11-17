package com.gonzalez.erp.modules.imports.service;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Lee una hoja de un .xlsx / .xls, o un .csv, como filas de texto. La primera fila son los
 * encabezados. Las celdas numéricas de Excel se marcan: su texto ya es un número sin separadores
 * de miles, a diferencia de lo que el usuario escribe a mano ("1.500,50").
 */
final class SpreadsheetReader {

    record SheetCell(String text, boolean numeric) {
        static final SheetCell EMPTY = new SheetCell("", false);

        boolean isBlank() {
            return text.isBlank();
        }
    }

    /** number: número de fila como lo muestra Excel (los encabezados son la 1). */
    record SheetRow(int number, List<SheetCell> cells) {
        SheetCell cell(int index) {
            return index >= 0 && index < cells.size() ? cells.get(index) : SheetCell.EMPTY;
        }

        boolean isBlank() {
            return cells.stream().allMatch(SheetCell::isBlank);
        }
    }

    record SheetData(List<String> headers, List<SheetRow> rows) {}

    static class UnreadableFileException extends Exception {
        UnreadableFileException(String message) {
            super(message);
        }
    }

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");

    private SpreadsheetReader() {}

    /**
     * sheetName: la hoja a leer de una planilla (sin distinguir mayúsculas); si no está, la primera.
     * maxRows: filas con datos; si hay más, error (no se sigue leyendo).
     */
    static SheetData read(String filename, byte[] content, String sheetName, int maxRows) throws UnreadableFileException {
        if (content.length == 0) {
            throw new UnreadableFileException("El archivo está vacío.");
        }
        String name = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (name.endsWith(".xlsx") || name.endsWith(".xls") || isWorkbook(content)) {
            return readWorkbook(content, sheetName, maxRows);
        }
        if (name.endsWith(".csv") || name.endsWith(".txt") || name.isEmpty()) {
            return readCsv(content, maxRows);
        }
        throw new UnreadableFileException("El archivo tiene que ser una planilla de Excel (.xlsx o .xls) o un .csv.");
    }

    /** ZIP (xlsx) o el formato binario viejo (xls), por si el archivo llega sin extensión. */
    private static boolean isWorkbook(byte[] content) {
        return content.length >= 4
                && ((content[0] == 'P' && content[1] == 'K')
                || ((content[0] & 0xFF) == 0xD0 && (content[1] & 0xFF) == 0xCF));
    }

    private static SheetData readWorkbook(byte[] content, String sheetName, int maxRows) throws UnreadableFileException {
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(content))) {
            if (workbook.getNumberOfSheets() == 0) {
                throw new UnreadableFileException("La planilla no tiene hojas.");
            }
            // Por nombre: así no importa si el usuario movió "Instrucciones" adelante. Un Excel
            // propio con otros nombres de hoja se lee desde la primera.
            Sheet named = workbook.getSheet(sheetName);
            Sheet sheet = named != null ? named : workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter(Locale.ROOT);

            List<String> headers = new ArrayList<>();
            List<SheetRow> rows = new ArrayList<>();
            for (Row row : sheet) {
                List<SheetCell> cells = new ArrayList<>();
                for (int i = 0; i < row.getLastCellNum(); i++) {
                    cells.add(cellOf(row.getCell(i), formatter));
                }
                if (row.getRowNum() == sheet.getFirstRowNum() && headers.isEmpty()) {
                    cells.forEach(cell -> headers.add(cell.text()));
                    continue;
                }
                SheetRow sheetRow = new SheetRow(row.getRowNum() + 1, cells);
                if (sheetRow.isBlank()) {
                    continue;
                }
                if (rows.size() == maxRows) {
                    throw tooManyRows(maxRows);
                }
                rows.add(sheetRow);
            }
            return new SheetData(headers, rows);
        } catch (IOException | RuntimeException e) {
            // POI tira IOException o excepciones propias (RuntimeException) con archivos dañados.
            throw new UnreadableFileException("No se pudo leer la planilla. Guardala de nuevo como .xlsx y volvé a intentar.");
        }
    }

    private static SheetCell cellOf(Cell cell, DataFormatter formatter) {
        if (cell == null) {
            return SheetCell.EMPTY;
        }
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        return switch (type) {
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? new SheetCell(formatter.formatCellValue(cell).trim(), false)
                    // BigDecimal.valueOf usa el texto más corto del double: 7790001234567, no 7.79E12.
                    : new SheetCell(BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString(), true);
            case STRING -> new SheetCell(cell.getStringCellValue().trim(), false);
            case BOOLEAN -> new SheetCell(String.valueOf(cell.getBooleanCellValue()), false);
            default -> SheetCell.EMPTY;
        };
    }

    private static SheetData readCsv(byte[] content, int maxRows) throws UnreadableFileException {
        String text = decode(content);
        List<List<String>> records = parseCsv(text, delimiterOf(text));
        if (records.isEmpty()) {
            return new SheetData(List.of(), List.of());
        }

        List<String> headers = records.getFirst().stream().map(String::trim).toList();
        List<SheetRow> rows = new ArrayList<>();
        for (int i = 1; i < records.size(); i++) {
            List<SheetCell> cells = records.get(i).stream()
                    .map(value -> new SheetCell(value.trim(), false))
                    .toList();
            SheetRow row = new SheetRow(i + 1, cells);
            if (row.isBlank()) {
                continue;
            }
            if (rows.size() == maxRows) {
                throw tooManyRows(maxRows);
            }
            rows.add(row);
        }
        return new SheetData(headers, rows);
    }

    /** "CSV UTF-8" de Excel trae BOM; el "CSV" a secas de Excel en Windows viene en windows-1252. */
    private static String decode(byte[] content) {
        if (content.length >= 3 && (content[0] & 0xFF) == 0xEF && (content[1] & 0xFF) == 0xBB && (content[2] & 0xFF) == 0xBF) {
            return new String(content, 3, content.length - 3, StandardCharsets.UTF_8);
        }
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(content))
                    .toString();
        } catch (CharacterCodingException e) {
            return new String(content, WINDOWS_1252);
        }
    }

    /** Excel en castellano separa con ";" (la coma es el decimal); Google Sheets, con ",". */
    private static char delimiterOf(String text) {
        int end = text.indexOf('\n');
        String firstLine = end < 0 ? text : text.substring(0, end);
        char best = ',';
        long bestCount = -1;
        for (char candidate : new char[] {';', ',', '\t'}) {
            long count = firstLine.chars().filter(c -> c == candidate).count();
            if (count > bestCount) {
                best = candidate;
                bestCount = count;
            }
        }
        return best;
    }

    /** RFC 4180: comillas dobles para campos con separadores o saltos de línea, "" escapa una comilla. */
    static List<List<String>> parseCsv(String text, char delimiter) {
        List<List<String>> records = new ArrayList<>();
        List<String> record = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (c == '"' && i + 1 < text.length() && text.charAt(i + 1) == '"') {
                    field.append('"');
                    i++;
                } else if (c == '"') {
                    quoted = false;
                } else {
                    field.append(c);
                }
            } else if (c == '"' && field.isEmpty()) {
                quoted = true;
            } else if (c == delimiter) {
                record.add(field.toString());
                field.setLength(0);
            } else if (c == '\n' || c == '\r') {
                if (c == '\r' && i + 1 < text.length() && text.charAt(i + 1) == '\n') {
                    i++;
                }
                record.add(field.toString());
                field.setLength(0);
                records.add(record);
                record = new ArrayList<>();
            } else {
                field.append(c);
            }
        }
        if (!field.isEmpty() || !record.isEmpty()) {
            record.add(field.toString());
            records.add(record);
        }
        return records;
    }

    private static UnreadableFileException tooManyRows(int maxRows) {
        return new UnreadableFileException(
                "El archivo tiene más de " + maxRows + " filas. Dividilo en varios y subilos de a uno.");
    }
}
