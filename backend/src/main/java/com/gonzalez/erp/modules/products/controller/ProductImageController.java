package com.gonzalez.erp.modules.products.controller;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.products.dto.request.ImageUploadUrlRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductImageOrderRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductImageRequest;
import com.gonzalez.erp.modules.products.dto.response.ImageUploadUrlResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductImageDeleteResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductImageResponse;
import com.gonzalez.erp.modules.products.service.ProductImageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Fotos de producto para la tienda web; las usa el panel de la tienda. */
@RestController
@RequestMapping("/api/v1/products/{productId}/images")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ADMINISTRAR_TIENDA')")
@Tag(name = "Product images", description = "Fotos de producto para la tienda web")
public class ProductImageController {

    private final ProductImageService imageService;

    @GetMapping
    @Operation(summary = "Listar fotos", description = "Las del producto y las de sus variantes (variantId), por orden.")
    public ResponseEntity<List<ProductImageResponse>> findAll(@PathVariable Long productId) {
        return ResponseEntity.ok(imageService.findAll(productId));
    }

    @PostMapping("/upload-url")
    @Operation(summary = "Pedir URL de subida",
            description = "Devuelve una URL firmada (10 minutos) para subir el archivo con PUT directo al almacenamiento, "
                    + "con el Content-Type y el tamaño declarados. JPG, PNG o WebP, hasta 2 MB, hasta 3 fotos por producto o variante.")
    @ApiResponse(responseCode = "422", description = "Tipo, tamaño o cantidad no permitidos",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ImageUploadUrlResponse> createUploadUrl(
            @PathVariable Long productId,
            @Valid @RequestBody ImageUploadUrlRequest request) {
        return ResponseEntity.ok(imageService.createUploadUrl(productId, request));
    }

    @PostMapping
    @Operation(summary = "Confirmar foto subida",
            description = "Registra el archivo subido con la URL firmada. Valida el archivo guardado (tamaño y formato real).")
    @ApiResponse(responseCode = "201", description = "Foto registrada al final del orden")
    @ApiResponse(responseCode = "422", description = "No se subió, es muy grande, no es una imagen permitida o se superó el límite",
            content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    public ResponseEntity<ProductImageResponse> confirm(
            @PathVariable Long productId,
            @Valid @RequestBody ProductImageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(imageService.confirm(productId, request));
    }

    @PatchMapping("/order")
    @Operation(summary = "Ordenar fotos",
            description = "Recibe todas las fotos del producto (o de la variante) en el orden nuevo; la primera es la portada.")
    public ResponseEntity<List<ProductImageResponse>> reorder(
            @PathVariable Long productId,
            @Valid @RequestBody ProductImageOrderRequest request) {
        return ResponseEntity.ok(imageService.reorder(productId, request));
    }

    @DeleteMapping("/{imageId}")
    @Operation(summary = "Borrar foto",
            description = "Si era la última foto de un producto publicado, lo despublica (productUnpublished = true).")
    public ResponseEntity<ProductImageDeleteResponse> delete(
            @PathVariable Long productId,
            @PathVariable Long imageId) {
        return ResponseEntity.ok(imageService.delete(productId, imageId));
    }
}
