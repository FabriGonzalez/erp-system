package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.products.dto.request.ImageUploadUrlRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductImageOrderRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductImageRequest;
import com.gonzalez.erp.modules.products.dto.response.ImageUploadUrlResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductImageDeleteResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductImageResponse;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductImage;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.exception.InvalidProductImageException;
import com.gonzalez.erp.modules.products.repository.ProductImageRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductImageServiceImpl implements ProductImageService {

    private static final Logger log = LoggerFactory.getLogger(ProductImageServiceImpl.class);

    static final long MAX_BYTES = 2L * 1024 * 1024;
    static final int MAX_PER_OWNER = 3;
    private static final Duration UPLOAD_VALIDITY = Duration.ofMinutes(10);
    private static final int SIGNATURE_LENGTH = 12;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final ImageStorage storage;

    @Override
    public List<ProductImageResponse> findAll(Long productId) {
        Product product = findProductOrThrow(productId);
        return imageRepository.findAllOfProduct(product.getId()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public ImageUploadUrlResponse createUploadUrl(Long productId, ImageUploadUrlRequest request) {
        Product product = findProductOrThrow(productId);
        ProductVariant variant = findVariantOrThrow(product, request.variantId());

        String extension = EXTENSIONS.get(request.contentType());
        if (extension == null) {
            throw InvalidProductImageException.invalidType();
        }
        if (request.sizeBytes() > MAX_BYTES) {
            throw InvalidProductImageException.tooLarge(MAX_BYTES);
        }
        requireRoomFor(imagesOf(product, variant));

        String key = keyPrefix(product) + UUID.randomUUID() + "." + extension;
        String uploadUrl = storage.presignUpload(key, request.contentType(), request.sizeBytes(), UPLOAD_VALIDITY);
        return new ImageUploadUrlResponse(key, uploadUrl, request.contentType(), Instant.now().plus(UPLOAD_VALIDITY));
    }

    @Override
    @Transactional
    public ProductImageResponse confirm(Long productId, ProductImageRequest request) {
        Product product = findProductOrThrow(productId);
        ProductVariant variant = findVariantOrThrow(product, request.variantId());
        String key = request.storageKey();

        // La clave tiene que ser una que generamos para este producto: así nadie registra un
        // archivo de otra empresa o de otro producto.
        String prefix = keyPrefix(product);
        if (!key.startsWith(prefix) || key.indexOf('/', prefix.length()) >= 0
                || imageRepository.existsByStorageKey(key)) {
            throw InvalidProductImageException.notUploaded();
        }

        List<ProductImage> current = imagesOf(product, variant);
        if (current.size() >= MAX_PER_OWNER) {
            storage.delete(key);
            throw InvalidProductImageException.limitReached(MAX_PER_OWNER);
        }

        // No se confía en lo que declaró el cliente: se mira el archivo que quedó guardado.
        ImageStorage.StoredObject stored = storage.find(key)
                .orElseThrow(InvalidProductImageException::notUploaded);
        if (stored.sizeBytes() > MAX_BYTES) {
            storage.delete(key);
            throw InvalidProductImageException.tooLarge(MAX_BYTES);
        }
        if (!isAllowedFormat(storage.readFirstBytes(key, SIGNATURE_LENGTH))) {
            storage.delete(key);
            throw InvalidProductImageException.invalidType();
        }

        int nextOrder = current.isEmpty() ? 0 : current.getLast().getSortOrder() + 1;
        ProductImage image = ProductImage.builder()
                .company(product.getCompany())
                .product(variant == null ? product : null)
                .variant(variant)
                .storageKey(key)
                .sortOrder(nextOrder)
                .build();
        return toResponse(imageRepository.save(image));
    }

    @Override
    @Transactional
    public List<ProductImageResponse> reorder(Long productId, ProductImageOrderRequest request) {
        Product product = findProductOrThrow(productId);
        ProductVariant variant = findVariantOrThrow(product, request.variantId());
        List<ProductImage> current = imagesOf(product, variant);

        List<Long> ids = request.imageIds();
        Map<Long, ProductImage> byId = current.stream()
                .collect(Collectors.toMap(ProductImage::getId, Function.identity()));
        if (ids.size() != current.size() || new HashSet<>(ids).size() != ids.size()
                || !byId.keySet().containsAll(ids)) {
            throw InvalidProductImageException.invalidOrder();
        }

        for (int i = 0; i < ids.size(); i++) {
            byId.get(ids.get(i)).moveTo(i);
        }
        return ids.stream().map(byId::get).map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public ProductImageDeleteResponse delete(Long productId, Long imageId) {
        Product product = findProductOrThrow(productId);
        ProductImage image = imageRepository.findById(imageId)
                .filter(candidate -> belongsTo(candidate, product))
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + imageId));

        imageRepository.delete(image);
        // La consulta vacía el delete pendiente a la base antes de contar (flush automático de JPA).
        boolean unpublished = product.isPublishedOnline()
                && !imageRepository.existsVisibleOfProduct(product.getId());
        if (unpublished) {
            product.unpublish();
        }

        deleteFromStorageAfterCommit(image.getStorageKey());
        return new ProductImageDeleteResponse(unpublished);
    }

    private Product findProductOrThrow(Long productId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        return productRepository.findByIdAndCompanyId(productId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + productId));
    }

    private static ProductVariant findVariantOrThrow(Product product, Long variantId) {
        if (variantId == null) {
            return null;
        }
        return product.getVariants().stream()
                .filter(variant -> variantId.equals(variant.getId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Variant " + variantId + " not found in product " + product.getId()));
    }

    private List<ProductImage> imagesOf(Product product, ProductVariant variant) {
        return variant == null
                ? imageRepository.findByProductIdOrderBySortOrderAscIdAsc(product.getId())
                : imageRepository.findByVariantIdOrderBySortOrderAscIdAsc(variant.getId());
    }

    private static void requireRoomFor(List<ProductImage> current) {
        if (current.size() >= MAX_PER_OWNER) {
            throw InvalidProductImageException.limitReached(MAX_PER_OWNER);
        }
    }

    /**
     * Reconoce el formato por los primeros bytes del archivo ("firma" o "magic number"), que no
     * dependen de la extensión ni del Content-Type que mandó el cliente.
     */
    static boolean isAllowedFormat(byte[] head) {
        return startsWith(head, 0, 0xFF, 0xD8, 0xFF)                                    // JPEG
                || startsWith(head, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)       // PNG
                || (startsWith(head, 0, 'R', 'I', 'F', 'F') && startsWith(head, 8, 'W', 'E', 'B', 'P')); // WebP
    }

    private static boolean startsWith(byte[] bytes, int offset, int... expected) {
        if (bytes.length < offset + expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[offset + i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean belongsTo(ProductImage image, Product product) {
        Product owner = image.getProduct() != null ? image.getProduct() : image.getVariant().getProduct();
        return Objects.equals(owner.getId(), product.getId());
    }

    private static String keyPrefix(Product product) {
        return "companies/" + product.getCompany().getId() + "/products/" + product.getId() + "/";
    }

    /**
     * El archivo se borra recién cuando la base confirmó el borrado: si la transacción se
     * revierte, la foto sigue registrada y su archivo sigue existiendo.
     */
    private void deleteFromStorageAfterCommit(String key) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteQuietly(key);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(key);
            }
        });
    }

    // Un archivo que no se pudo borrar solo ocupa lugar; no tiene sentido fallar el pedido por eso.
    private void deleteQuietly(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException e) {
            log.warn("Could not delete image {} from storage", key, e);
        }
    }

    private ProductImageResponse toResponse(ProductImage image) {
        return new ProductImageResponse(
                image.getId(),
                image.getVariant() != null ? image.getVariant().getId() : null,
                storage.publicUrl(image.getStorageKey()),
                image.getSortOrder(),
                image.getVariant() == null || image.getVariant().isActive()
        );
    }
}
