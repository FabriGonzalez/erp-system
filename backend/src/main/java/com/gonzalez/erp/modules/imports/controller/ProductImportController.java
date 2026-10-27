package com.gonzalez.erp.modules.imports.controller;

import com.gonzalez.erp.modules.imports.dto.response.ProductImportResult;
import com.gonzalez.erp.modules.imports.service.ProductImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;

@RestController
@RequestMapping("/api/v1/imports/products")
@RequiredArgsConstructor
@Tag(name = "Imports", description = "Importación de productos desde una planilla")
public class ProductImportController {

    private static final MediaType XLSX =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ProductImportService importService;

    @Operation(summary = "Plantilla de importación",
            description = "Planilla .xlsx con las columnas fijas, los atributos y una columna de stock por sucursal activa.")
    @PreAuthorize("hasAuthority('ADMINISTRAR_PRODUCTOS')")
    @GetMapping("/template")
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("plantilla-productos.xlsx").build().toString())
                .body(importService.template());
    }

    @Operation(summary = "Previsualizar importación",
            description = "Lee y valida un .xlsx, .xls o .csv sin guardar nada. Responde qué pasaría con cada fila.")
    @PreAuthorize("hasAuthority('ADMINISTRAR_PRODUCTOS')")
    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductImportResult> preview(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(importService.preview(file.getOriginalFilename(), bytesOf(file)));
    }

    @Operation(summary = "Importar productos",
            description = "Valida de nuevo el archivo y, si no hay errores, guarda todo en una transacción "
                    + "(applied = true). Con errores no guarda nada y responde lo mismo que la previsualización.")
    @PreAuthorize("hasAuthority('ADMINISTRAR_PRODUCTOS')")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductImportResult> importProducts(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(importService.importProducts(file.getOriginalFilename(), bytesOf(file)));
    }

    private static byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
