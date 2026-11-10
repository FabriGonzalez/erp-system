package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.products.entity.ProductImage;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.entity.ProductVariantAttribute;
import com.gonzalez.erp.modules.products.service.ImageStorage;
import com.gonzalez.erp.modules.store.dto.StoreProductResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Cómo la tienda muestra fotos y atributos de un producto. Lo comparten el catálogo y "Mis
 * pedidos" para que el comprador vea la misma portada en los dos lados.
 */
@Component
@RequiredArgsConstructor
public class StoreProductViews {

    private final ImageStorage storage;

    /**
     * Portada: la primera foto del producto o, si no tiene, la primera de la primera variante
     * (por id) que tenga. Las fotos llegan ordenadas por sortOrder.
     */
    public String coverOf(List<ProductImage> images) {
        return images.stream()
                .filter(image -> image.getVariant() == null)
                .findFirst()
                .or(() -> images.stream()
                        .filter(image -> image.getVariant() != null)
                        .min(Comparator.comparing((ProductImage image) -> image.getVariant().getId())
                                .thenComparingInt(ProductImage::getSortOrder)
                                .thenComparing(ProductImage::getId)))
                .map(image -> storage.publicUrl(image.getStorageKey()))
                .orElse(null);
    }

    /** La primera foto propia de la variante o, si no tiene, la portada del producto. */
    public String variantCoverOf(List<ProductImage> productImages, Long variantId) {
        return productImages.stream()
                .filter(image -> image.getVariant() != null && image.getVariant().getId().equals(variantId))
                .findFirst()
                .map(image -> storage.publicUrl(image.getStorageKey()))
                .orElseGet(() -> coverOf(productImages));
    }

    public List<String> urls(List<ProductImage> images) {
        return images.stream().map(image -> storage.publicUrl(image.getStorageKey())).toList();
    }

    public static List<StoreProductResponse.Attribute> attributesOf(ProductVariant variant) {
        return variant.getAttributes().stream()
                .map(ProductVariantAttribute::getAttributeValue)
                .filter(Objects::nonNull)
                .map(value -> new StoreProductResponse.Attribute(value.getAttribute().getName(), value.getValue()))
                .sorted(Comparator.comparing(StoreProductResponse.Attribute::name))
                .toList();
    }

    /** Producto dueño de la foto, sea propia o de una de sus variantes. */
    public static Long ownerProductId(ProductImage image) {
        return image.getProduct() != null ? image.getProduct().getId() : image.getVariant().getProduct().getId();
    }
}
