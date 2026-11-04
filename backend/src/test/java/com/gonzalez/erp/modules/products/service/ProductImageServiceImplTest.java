package com.gonzalez.erp.modules.products.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.companies.entity.Company;
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
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductImageServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long PRODUCT_ID = 20L;
    private static final Long VARIANT_ID = 40L;
    private static final String PREFIX = "companies/1/products/20/";
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0, 0, 0, 0, 0, 0, 0, 0, 0};
    private static final byte[] WEBP = {'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'};
    private static final byte[] TEXT = "hola, no soy".getBytes();

    @Mock private ProductRepository productRepository;
    @Mock private ProductImageRepository imageRepository;
    @Mock private ImageStorage storage;

    @InjectMocks private ProductImageServiceImpl imageService;

    private Company company;
    private Product product;
    private ProductVariant variant;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        Category category = Category.builder().name("Ropa").company(company).build();
        product = Product.builder().name("Remera").category(category).company(company).build();
        product.setId(PRODUCT_ID);
        variant = ProductVariant.builder().sku("REM-M").price(new BigDecimal("1000")).company(company).build();
        variant.setId(VARIANT_ID);
        product.addVariant(variant);
        login();

        when(productRepository.findByIdAndCompanyId(PRODUCT_ID, COMPANY_ID)).thenReturn(Optional.of(product));
        when(imageRepository.findByProductIdOrderBySortOrderAscIdAsc(PRODUCT_ID)).thenReturn(List.of());
        when(imageRepository.findByVariantIdOrderBySortOrderAscIdAsc(VARIANT_ID)).thenReturn(List.of());
        when(imageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(storage.presignUpload(anyString(), anyString(), anyLong(), any())).thenReturn("https://upload");
        when(storage.publicUrl(anyString())).thenAnswer(invocation -> "https://cdn/" + invocation.getArgument(0));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void uploadUrlUsesAKeyOfThisCompanyAndProduct() {
        ImageUploadUrlResponse response = imageService.createUploadUrl(PRODUCT_ID,
                new ImageUploadUrlRequest(null, "image/webp", 1000L));

        assertThat(response.storageKey()).startsWith(PREFIX).endsWith(".webp");
        assertThat(response.uploadUrl()).isEqualTo("https://upload");
        verify(storage).presignUpload(eq(response.storageKey()), eq("image/webp"), eq(1000L), any());
    }

    @Test
    void uploadUrlRejectsOtherFormats() {
        assertRejected(() -> imageService.createUploadUrl(PRODUCT_ID,
                new ImageUploadUrlRequest(null, "image/gif", 1000L)), "IMAGE_INVALID_TYPE");
    }

    @Test
    void uploadUrlRejectsMoreThanTwoMegabytes() {
        assertRejected(() -> imageService.createUploadUrl(PRODUCT_ID,
                new ImageUploadUrlRequest(null, "image/png", 2L * 1024 * 1024 + 1)), "IMAGE_TOO_LARGE");
    }

    @Test
    void uploadUrlRejectsAFourthImageOfTheVariant() {
        when(imageRepository.findByVariantIdOrderBySortOrderAscIdAsc(VARIANT_ID))
                .thenReturn(List.of(variantImage(1L, 0), variantImage(2L, 1), variantImage(3L, 2)));

        assertRejected(() -> imageService.createUploadUrl(PRODUCT_ID,
                new ImageUploadUrlRequest(VARIANT_ID, "image/png", 1000L)), "IMAGE_LIMIT_REACHED");
    }

    @Test
    void theVariantMustBelongToTheProduct() {
        assertThatThrownBy(() -> imageService.createUploadUrl(PRODUCT_ID,
                new ImageUploadUrlRequest(999L, "image/png", 1000L)))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void confirmRegistersTheImageAtTheEnd() {
        when(imageRepository.findByProductIdOrderBySortOrderAscIdAsc(PRODUCT_ID))
                .thenReturn(List.of(productImage(1L, 0)));
        String key = PREFIX + "nueva.png";
        uploaded(key, 1000, PNG);

        ProductImageResponse response = imageService.confirm(PRODUCT_ID, new ProductImageRequest(key, null));

        assertThat(response.sortOrder()).isEqualTo(1);
        assertThat(response.variantId()).isNull();
        assertThat(response.url()).isEqualTo("https://cdn/" + key);
    }

    @Test
    void confirmAcceptsJpegAndWebpOfAVariant() {
        uploaded(PREFIX + "a.jpg", 1000, JPEG);
        uploaded(PREFIX + "b.webp", 1000, WEBP);

        assertThat(imageService.confirm(PRODUCT_ID, new ProductImageRequest(PREFIX + "a.jpg", VARIANT_ID)).variantId())
                .isEqualTo(VARIANT_ID);
        assertThat(imageService.confirm(PRODUCT_ID, new ProductImageRequest(PREFIX + "b.webp", VARIANT_ID)).variantId())
                .isEqualTo(VARIANT_ID);
    }

    @Test
    void confirmRejectsAKeyOfAnotherProductOrCompany() {
        assertRejected(() -> imageService.confirm(PRODUCT_ID,
                new ProductImageRequest("companies/2/products/20/x.png", null)), "IMAGE_NOT_UPLOADED");
        assertRejected(() -> imageService.confirm(PRODUCT_ID,
                new ProductImageRequest(PREFIX + "otra/carpeta.png", null)), "IMAGE_NOT_UPLOADED");
        verify(imageRepository, never()).save(any());
    }

    @Test
    void confirmRejectsAFileThatWasNeverUploaded() {
        when(storage.find(anyString())).thenReturn(Optional.empty());

        assertRejected(() -> imageService.confirm(PRODUCT_ID,
                new ProductImageRequest(PREFIX + "nada.png", null)), "IMAGE_NOT_UPLOADED");
    }

    @Test
    void confirmDeletesAndRejectsAFileThatIsTooLarge() {
        String key = PREFIX + "grande.png";
        uploaded(key, 3L * 1024 * 1024, PNG);

        assertRejected(() -> imageService.confirm(PRODUCT_ID, new ProductImageRequest(key, null)), "IMAGE_TOO_LARGE");
        verify(storage).delete(key);
    }

    @Test
    void confirmDeletesAndRejectsAFileThatIsNotAnImageWhateverItsName() {
        String key = PREFIX + "trucho.png";
        uploaded(key, 1000, TEXT);

        assertRejected(() -> imageService.confirm(PRODUCT_ID, new ProductImageRequest(key, null)), "IMAGE_INVALID_TYPE");
        verify(storage).delete(key);
        verify(imageRepository, never()).save(any());
    }

    @Test
    void anImageOfAnInactiveVariantIsMarkedAsNotVisibleInTheStore() {
        variant.deactivate();
        uploaded(PREFIX + "a.png", 1000, PNG);
        uploaded(PREFIX + "b.png", 1000, PNG);

        // Se acepta igual: sirve si la variante se reactiva. La del producto siempre se ve.
        assertThat(imageService.confirm(PRODUCT_ID, new ProductImageRequest(PREFIX + "a.png", VARIANT_ID)).visibleInStore())
                .isFalse();
        assertThat(imageService.confirm(PRODUCT_ID, new ProductImageRequest(PREFIX + "b.png", null)).visibleInStore())
                .isTrue();
    }

    @Test
    void reorderFollowsTheGivenIds() {
        ProductImage first = productImage(1L, 0);
        ProductImage second = productImage(2L, 1);
        when(imageRepository.findByProductIdOrderBySortOrderAscIdAsc(PRODUCT_ID)).thenReturn(List.of(first, second));

        List<ProductImageResponse> result = imageService.reorder(PRODUCT_ID, new ProductImageOrderRequest(null, List.of(2L, 1L)));

        assertThat(result).extracting(ProductImageResponse::id).containsExactly(2L, 1L);
        assertThat(second.getSortOrder()).isZero();
        assertThat(first.getSortOrder()).isEqualTo(1);
    }

    @Test
    void reorderNeedsExactlyTheCurrentImages() {
        when(imageRepository.findByProductIdOrderBySortOrderAscIdAsc(PRODUCT_ID))
                .thenReturn(List.of(productImage(1L, 0), productImage(2L, 1)));

        assertRejected(() -> imageService.reorder(PRODUCT_ID, new ProductImageOrderRequest(null, List.of(1L))),
                "IMAGE_INVALID_ORDER");
        assertRejected(() -> imageService.reorder(PRODUCT_ID, new ProductImageOrderRequest(null, List.of(1L, 1L))),
                "IMAGE_INVALID_ORDER");
        assertRejected(() -> imageService.reorder(PRODUCT_ID, new ProductImageOrderRequest(null, List.of(1L, 9L))),
                "IMAGE_INVALID_ORDER");
    }

    @Test
    void deletingTheLastVisibleImageUnpublishesTheProduct() {
        publish();
        ProductImage image = productImage(1L, 0);
        when(imageRepository.findById(1L)).thenReturn(Optional.of(image));
        when(imageRepository.existsVisibleOfProduct(PRODUCT_ID)).thenReturn(false);

        ProductImageDeleteResponse response = imageService.delete(PRODUCT_ID, 1L);

        assertThat(response.productUnpublished()).isTrue();
        assertThat(product.isPublishedOnline()).isFalse();
        verify(imageRepository).delete(image);
        verify(storage).delete(image.getStorageKey());
    }

    @Test
    void deletingWhileVisibleImagesRemainKeepsItPublished() {
        publish();
        when(imageRepository.findById(1L)).thenReturn(Optional.of(productImage(1L, 0)));
        when(imageRepository.existsVisibleOfProduct(PRODUCT_ID)).thenReturn(true);

        ProductImageDeleteResponse response = imageService.delete(PRODUCT_ID, 1L);

        assertThat(response.productUnpublished()).isFalse();
        assertThat(product.isPublishedOnline()).isTrue();
    }

    @Test
    void anImageOfAnotherProductIsNotFound() {
        Product other = Product.builder().name("Buzo").company(company).build();
        other.setId(99L);
        ProductImage foreign = ProductImage.builder().company(company).product(other).storageKey("k").build();
        foreign.setId(5L);
        when(imageRepository.findById(5L)).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> imageService.delete(PRODUCT_ID, 5L)).isInstanceOf(ResourceNotFoundException.class);
        verify(imageRepository, never()).delete(any());
    }

    private void uploaded(String key, long size, byte[] head) {
        when(storage.find(key)).thenReturn(Optional.of(new ImageStorage.StoredObject(size)));
        when(storage.readFirstBytes(eq(key), anyInt())).thenReturn(head);
    }

    private ProductImage productImage(Long id, int order) {
        ProductImage image = ProductImage.builder()
                .company(company).product(product).storageKey(PREFIX + id + ".png").sortOrder(order).build();
        image.setId(id);
        return image;
    }

    private ProductImage variantImage(Long id, int order) {
        ProductImage image = ProductImage.builder()
                .company(company).variant(variant).storageKey(PREFIX + "v" + id + ".png").sortOrder(order).build();
        image.setId(id);
        return image;
    }

    // Publicar llega en el paso 2b; acá alcanza con dejar el producto publicado.
    private void publish() {
        ReflectionTestUtils.setField(product, "publishedOnline", true);
    }

    private static void assertRejected(Runnable call, String code) {
        assertThatThrownBy(call::run)
                .isInstanceOf(InvalidProductImageException.class)
                .extracting("code")
                .isEqualTo(code);
    }

    private void login() {
        Role role = Role.builder()
                .name("Rol").code("ROL").company(company)
                .permissions(EnumSet.of(Permission.ADMINISTRAR_TIENDA))
                .build();
        User user = User.builder()
                .username("tienda").email("tienda@acme.com").password("x")
                .company(company).role(role)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
