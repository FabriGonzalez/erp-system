package com.gonzalez.erp.modules.imports.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.categories.dto.request.CategoryRequest;
import com.gonzalez.erp.modules.categories.dto.response.CategoryResponse;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.categories.service.CategoryService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.imports.dto.response.ProductImportAction;
import com.gonzalez.erp.modules.imports.dto.response.ProductImportResult;
import com.gonzalez.erp.modules.imports.dto.response.ProductImportRow;
import com.gonzalez.erp.modules.inventory.entity.Stock;
import com.gonzalez.erp.modules.inventory.repository.StockRepository;
import com.gonzalez.erp.modules.products.dto.request.InitialStockRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductAttributeValueRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductUpdateRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantStockRequest;
import com.gonzalez.erp.modules.products.dto.request.ProductVariantUpdateRequest;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeResponse;
import com.gonzalez.erp.modules.products.dto.response.ProductAttributeValueResponse;
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.entity.ProductVariantAttribute;
import com.gonzalez.erp.modules.products.repository.ProductAttributeRepository;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.products.service.ProductAttributeService;
import com.gonzalez.erp.modules.products.service.ProductService;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.users.entity.User;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductImportServiceImplTest {

    private static final Long COMPANY_ID = 1L;
    private static final Long BRANCH_ID = 100L;
    private static final Long CATEGORY_ID = 30L;
    private static final Long SIZE_ID = 60L;
    private static final Long SIZE_M_ID = 61L;
    private static final Long SIZE_L_ID = 62L;
    private static final Long PRODUCT_ID = 20L;

    @Mock private ProductService productService;
    @Mock private CategoryService categoryService;
    @Mock private ProductAttributeService attributeService;
    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository variantRepository;
    @Mock private ProductAttributeRepository attributeRepository;
    @Mock private ProductAttributeValueRepository attributeValueRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private BranchRepository branchRepository;
    @Mock private BranchAccessService branchAccessService;
    @Mock private StockRepository stockRepository;

    @InjectMocks private ProductImportServiceImpl importService;

    private Company company;
    private Branch branch;
    private Category category;
    private ProductAttribute size;
    private ProductAttributeValue sizeM;
    private ProductAttributeValue sizeL;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        branch = Branch.builder().name("Centro").company(company).build();
        branch.setId(BRANCH_ID);
        category = Category.builder().name("Remeras").company(company).build();
        category.setId(CATEGORY_ID);
        size = ProductAttribute.builder().name("Talle").company(company).build();
        size.setId(SIZE_ID);
        sizeM = ProductAttributeValue.builder().attribute(size).value("M").build();
        sizeM.setId(SIZE_M_ID);
        sizeL = ProductAttributeValue.builder().attribute(size).value("L").build();
        sizeL.setId(SIZE_L_ID);

        when(branchRepository.findByCompanyIdAndActive(COMPANY_ID, true)).thenReturn(List.of(branch));
        when(branchAccessService.accessibleBranchIds()).thenReturn(List.of(BRANCH_ID));
        when(categoryRepository.findByCompanyId(COMPANY_ID)).thenReturn(List.of(category));
        when(attributeRepository.findByCompanyId(COMPANY_ID)).thenReturn(List.of(size));
        when(attributeValueRepository.findAllByCompanyIdWithAttribute(COMPANY_ID, null)).thenReturn(List.of(sizeM));
        when(variantRepository.findSkusByCompanyId(COMPANY_ID)).thenReturn(List.of("SKU-RE-M-RO"));

        authenticate(Permission.ADMINISTRAR_PRODUCTOS, Permission.ADMINISTRAR_PRECIOS, Permission.ADMINISTRAR_CATEGORIAS);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private static final String NEW_PRODUCT = """
            Producto;Categoría;SKU;Precio;Talle;Color;Stock Centro
            Remera lisa;Remeras;;1.500;M;Rojo;5
            remera  LISA;remeras;;1500,50;L;Rojo;
            """;

    @Test
    void rowsWithTheSameNameAreVariantsOfOneNewProductWithGeneratedSkus() {
        ProductImportResult result = importService.preview("productos.csv", csv(NEW_PRODUCT));

        assertThat(result.valid()).isTrue();
        assertThat(result.productsToCreate()).isEqualTo(1);
        assertThat(result.variantsToCreate()).isEqualTo(2);
        // SKU-RE-M-RO ya lo usa otro producto.
        assertThat(result.rows()).extracting(ProductImportRow::sku).containsExactly("SKU-RE-M-RO-2", "SKU-RE-L-RO");
        assertThat(result.categoriesToCreate()).isEmpty();
        assertThat(result.attributesToCreate()).containsExactlyInAnyOrder("Talle: L", "Color (atributo nuevo): Rojo");
        verify(productService, never()).create(any());
    }

    @Test
    void confirmingCreatesTheMissingCatalogAndTheProduct() {
        when(attributeService.addValue(eq(SIZE_ID), any())).thenReturn(valueResponse(SIZE_L_ID));
        when(attributeService.create(new ProductAttributeRequest("Color"))).thenReturn(
                new ProductAttributeResponse(70L, "Color", true, null, null));
        when(attributeService.addValue(eq(70L), any())).thenReturn(valueResponse(71L));

        ProductImportResult result = importService.importProducts("productos.csv", csv(NEW_PRODUCT));

        assertThat(result.applied()).isTrue();
        verify(attributeService).addValue(SIZE_ID, new ProductAttributeValueRequest("L"));
        verify(attributeService).addValue(70L, new ProductAttributeValueRequest("Rojo"));
        ArgumentCaptor<ProductRequest> request = ArgumentCaptor.forClass(ProductRequest.class);
        verify(productService).create(request.capture());
        assertThat(request.getValue().name()).isEqualTo("Remera lisa");
        assertThat(request.getValue().categoryId()).isEqualTo(CATEGORY_ID);
        assertThat(request.getValue().variants()).containsExactly(
                new ProductVariantRequest("SKU-RE-M-RO-2", new BigDecimal("1500.00"), null,
                        List.of(SIZE_M_ID, 71L), List.of(new InitialStockRequest(BRANCH_ID, 5))),
                new ProductVariantRequest("SKU-RE-L-RO", new BigDecimal("1500.50"), null,
                        List.of(SIZE_L_ID, 71L), List.of()));
    }

    @Test
    void aMissingCategoryIsCreatedWithItsPermission() {
        when(categoryService.create(any())).thenReturn(
                new CategoryResponse(31L, "Buzos", null, COMPANY_ID, true, null, null));

        importService.importProducts("p.csv", csv("""
                Producto;Categoría;Precio
                Buzo;Buzos;3000
                """));

        verify(categoryService).create(new CategoryRequest("Buzos", null));
        ArgumentCaptor<ProductRequest> request = ArgumentCaptor.forClass(ProductRequest.class);
        verify(productService).create(request.capture());
        assertThat(request.getValue().categoryId()).isEqualTo(31L);
        assertThat(request.getValue().variants()).extracting(ProductVariantRequest::sku).containsExactly("SKU-BU");
    }

    @Test
    void anExistingSkuUpdatesPriceAndStockAndKeepsTheOtherVariants() {
        Product product = Product.builder().name("Remera").category(category).company(company).build();
        product.setId(PRODUCT_ID);
        ProductVariant medium = variant(product, 40L, "REM-M", sizeM);
        ProductVariant large = variant(product, 41L, "REM-L", sizeL);
        when(variantRepository.findByCompanyIdAndUpperSkuIn(COMPANY_ID, Set.of("REM-M"))).thenReturn(List.of(medium));
        when(stockRepository.findByProductVariantIdInAndCompanyId(List.of(40L), COMPANY_ID)).thenReturn(List.of(
                Stock.builder().productVariant(medium).branch(branch).company(company).quantity(3).build()));
        when(variantRepository.findByProductIdInWithAttributes(anyCollection())).thenReturn(List.of(medium, large));

        String file = """
                Producto;SKU;Precio;Talle;Stock Centro
                Remera;rem-m;1.200;M;8
                """;
        ProductImportRow row = importService.preview("p.csv", csv(file)).rows().getFirst();
        assertThat(row.action()).isEqualTo(ProductImportAction.UPDATE);
        assertThat(row.changes()).containsExactly("Precio: $1.000 → $1.200", "Stock Centro: 3 → 8");

        importService.importProducts("p.csv", csv(file));

        verify(productService, never()).create(any());
        verify(productService).update(PRODUCT_ID, new ProductUpdateRequest("Remera", null, CATEGORY_ID, List.of(
                new ProductVariantUpdateRequest("REM-M", new BigDecimal("1200.00"), null, List.of(SIZE_M_ID),
                        List.of(new ProductVariantStockRequest(BRANCH_ID, 8))),
                new ProductVariantUpdateRequest("REM-L", new BigDecimal("1000.00"), null, List.of(SIZE_L_ID), List.of()))));
    }

    @Test
    void anyRowWithErrorsBlocksTheWholeImport() {
        ProductImportResult result = importService.importProducts("p.csv", csv("""
                Producto;Categoría;SKU;Precio;Talle
                Buzo;;;3000;
                Media;Medias;MED-1;-5;
                Pack;Medias;MED-1;100;
                Short;Shorts;;900;
                Short;Shorts;;900;
                """));

        assertThat(result.valid()).isFalse();
        assertThat(result.applied()).isFalse();
        assertThat(result.productsToCreate()).isZero();
        assertThat(result.variantsToCreate()).isZero();
        assertThat(result.rows()).extracting(ProductImportRow::errors).containsExactly(
                List.of("Falta la categoría."),
                List.of("El precio tiene que ser mayor a $0."),
                List.of("El SKU MED-1 ya está en la fila 3."),
                List.of("\"Short\" tiene varias filas: cada una necesita al menos un atributo (Talle, Color…)."),
                List.of("\"Short\" tiene varias filas: cada una necesita al menos un atributo (Talle, Color…)."));
        verify(productService, never()).create(any());
        verify(categoryService, never()).create(any());
    }

    @Test
    void withoutThePricePermissionNothingCanBeCreated() {
        authenticate(Permission.ADMINISTRAR_PRODUCTOS);

        ProductImportResult result = importService.preview("p.csv", csv("""
                Producto;Categoría;Precio
                Buzo;Remeras;3000
                """));

        assertThat(result.rows().getFirst().errors())
                .containsExactly("Crear productos requiere el permiso \"Administrar precios\".");
    }

    @Test
    void theDownloadedTemplateIsReadBackWithTheSameColumns() throws Exception {
        when(attributeRepository.findByCompanyIdAndActive(COMPANY_ID, true)).thenReturn(List.of(size));
        byte[] filled;
        try (XSSFWorkbook workbook = new XSSFWorkbook(new ByteArrayInputStream(importService.template()));
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Producto, Descripción, Categoría, SKU, Código de barras, Precio, Talle, Stock Centro
            Row row = workbook.getSheet("Productos").createRow(1);
            row.createCell(0).setCellValue("Remera");
            row.createCell(2).setCellValue("Remeras");
            row.createCell(5).setCellValue(1500);
            row.createCell(6).setCellValue("M");
            row.createCell(7).setCellValue(4);
            workbook.write(out);
            filled = out.toByteArray();
        }

        ProductImportResult result = importService.preview("plantilla-productos.xlsx", filled);

        assertThat(result.fileErrors()).isEmpty();
        assertThat(result.valid()).isTrue();
        assertThat(result.rows()).extracting(ProductImportRow::sku).containsExactly("SKU-RE-M");
    }

    @Test
    void aStockColumnOfAnUnknownBranchIsAFileError() {
        ProductImportResult result = importService.preview("p.csv", csv("""
                Producto;Stock Norte
                Buzo;3
                """));

        assertThat(result.fileErrors()).containsExactly("La columna \"Stock Norte\" no coincide con ninguna sucursal activa.");
        assertThat(result.rows()).isEmpty();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "1500|1500",
            "1500,50|1500.50",
            "1.500|1500",
            "1.500,50|1500.50",
            "1,500.50|1500.50",
            "$ 2.000|2000",
            "1.5|1.5",
            "1.234.567|1234567"
    })
    void typedNumbersAcceptTheLocalFormat(String typed, String expected) {
        assertThat(ProductImportServiceImpl.parseTypedNumber(typed)).isEqualByComparingTo(expected);
    }

    private ProductVariant variant(Product product, Long id, String sku, ProductAttributeValue value) {
        ProductVariant variant = ProductVariant.builder()
                .sku(sku)
                .price(new BigDecimal("1000.00"))
                .product(product)
                .company(company)
                .build();
        variant.setId(id);
        variant.getAttributes().add(ProductVariantAttribute.builder().variant(variant).attributeValue(value).build());
        return variant;
    }

    private static ProductAttributeValueResponse valueResponse(Long id) {
        return new ProductAttributeValueResponse(id, null, null, null, true, null, null);
    }

    private static byte[] csv(String content) {
        return content.getBytes(StandardCharsets.UTF_8);
    }

    private void authenticate(Permission... permissions) {
        Role role = Role.builder()
                .name("Rol")
                .code("ROL")
                .company(company)
                .permissions(EnumSet.copyOf(List.of(permissions)))
                .build();
        User user = User.builder()
                .username("admin")
                .email("admin@acme.com")
                .password("x")
                .company(company)
                .role(role)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
