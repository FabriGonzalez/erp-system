package com.gonzalez.erp.modules.imports.service;

import com.gonzalez.erp.common.util.SearchText;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.branches.service.BranchAccessService;
import com.gonzalez.erp.modules.categories.dto.request.CategoryRequest;
import com.gonzalez.erp.modules.categories.entity.Category;
import com.gonzalez.erp.modules.categories.repository.CategoryRepository;
import com.gonzalez.erp.modules.categories.service.CategoryService;
import com.gonzalez.erp.modules.imports.dto.response.ProductImportAction;
import com.gonzalez.erp.modules.imports.dto.response.ProductImportResult;
import com.gonzalez.erp.modules.imports.dto.response.ProductImportRow;
import com.gonzalez.erp.modules.imports.service.ProductImportTemplate.FixedColumn;
import com.gonzalez.erp.modules.imports.service.SpreadsheetReader.SheetCell;
import com.gonzalez.erp.modules.imports.service.SpreadsheetReader.SheetData;
import com.gonzalez.erp.modules.imports.service.SpreadsheetReader.SheetRow;
import com.gonzalez.erp.modules.imports.service.SpreadsheetReader.UnreadableFileException;
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
import com.gonzalez.erp.modules.products.entity.Product;
import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import com.gonzalez.erp.modules.products.entity.ProductVariant;
import com.gonzalez.erp.modules.products.repository.ProductAttributeRepository;
import com.gonzalez.erp.modules.products.repository.ProductAttributeValueRepository;
import com.gonzalez.erp.modules.products.repository.ProductRepository;
import com.gonzalez.erp.modules.products.repository.ProductVariantRepository;
import com.gonzalez.erp.modules.products.service.ProductAttributeService;
import com.gonzalez.erp.modules.products.service.ProductService;
import com.gonzalez.erp.modules.products.service.Skus;
import com.gonzalez.erp.modules.roles.entity.Permission;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.*;
import java.util.stream.Collectors;

/*
 * Importación de productos desde una planilla. Primero se analiza todo el archivo en memoria, con
 * una consulta por tipo de dato (SKUs, códigos de barras, catálogo, stock), y recién si no hay
 * errores se guarda reutilizando ProductService, CategoryService y ProductAttributeService: así
 * valen las mismas reglas que en el formulario (precio > 0, permisos, stock y sus movimientos).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductImportServiceImpl implements ProductImportService {

    static final int MAX_ROWS = 5000;
    private static final int EXPORT_BATCH = 1000;
    /** price es numeric(12,2). */
    private static final BigDecimal MAX_PRICE = new BigDecimal("10000000000");

    private final ProductService productService;
    private final CategoryService categoryService;
    private final ProductAttributeService attributeService;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductAttributeRepository attributeRepository;
    private final ProductAttributeValueRepository attributeValueRepository;
    private final CategoryRepository categoryRepository;
    private final BranchRepository branchRepository;
    private final BranchAccessService branchAccessService;
    private final StockRepository stockRepository;

    @Override
    public byte[] template() {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<String> attributes = attributeRepository.findByCompanyIdAndActive(companyId, true).stream()
                .map(ProductAttribute::getName)
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .toList();
        List<String> branches = activeBranches(companyId).stream().map(Branch::getName).toList();
        return ProductImportTemplate.build(attributes, branches);
    }

    /*
     * Variantes activas de productos activos, una por fila, con el stock de cada sucursal activa
     * (0 si no tiene). Reimportado sin cambios, cada fila da UNCHANGED. Las columnas de atributo
     * son las activas más las que usan estas variantes aunque estén desactivadas.
     */
    @Override
    public byte[] export() {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<Branch> branches = activeBranches(companyId);
        List<ProductVariant> variants = variantRepository.findActiveForExport(companyId).stream()
                .sorted(Comparator
                        .comparing((ProductVariant variant) -> variant.getProduct().getName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(variant -> variant.getProduct().getId())
                        .thenComparing(ProductVariant::getSku))
                .toList();

        Map<String, String> attributeNames = new HashMap<>();
        attributeRepository.findByCompanyIdAndActive(companyId, true)
                .forEach(attribute -> attributeNames.putIfAbsent(SearchText.normalize(attribute.getName()), attribute.getName()));
        variants.forEach(variant -> variant.getAttributes().forEach(pva -> {
            String name = pva.getAttributeValue().getAttribute().getName();
            attributeNames.putIfAbsent(SearchText.normalize(name), name);
        }));

        Map<Long, Map<String, Integer>> stockByVariant = new HashMap<>();
        Map<Long, String> branchKeys = new HashMap<>();
        branches.forEach(branch -> branchKeys.put(branch.getId(), SearchText.normalize(branch.getName())));
        List<Long> variantIds = variants.stream().map(ProductVariant::getId).toList();
        // De a tandas: un IN con decenas de miles de ids pasaría el límite de parámetros de Postgres.
        for (int from = 0; from < variantIds.size(); from += EXPORT_BATCH) {
            List<Long> batch = variantIds.subList(from, Math.min(from + EXPORT_BATCH, variantIds.size()));
            for (Stock stock : stockRepository.findByProductVariantIdInAndCompanyId(batch, companyId)) {
                String branchKey = branchKeys.get(stock.getBranch().getId());
                if (branchKey != null) {
                    stockByVariant.computeIfAbsent(stock.getProductVariant().getId(), key -> new HashMap<>())
                            .put(branchKey, stock.getQuantity());
                }
            }
        }

        List<ProductImportTemplate.CatalogRow> rows = variants.stream()
                .map(variant -> {
                    Product product = variant.getProduct();
                    Map<String, String> values = new HashMap<>();
                    variant.getAttributes().forEach(pva -> values.put(
                            SearchText.normalize(pva.getAttributeValue().getAttribute().getName()),
                            pva.getAttributeValue().getValue()));
                    return new ProductImportTemplate.CatalogRow(
                            product.getName(),
                            product.getDescription(),
                            product.getCategory().getName(),
                            variant.getSku(),
                            variant.getBarcode(),
                            variant.getPrice(),
                            values,
                            stockByVariant.getOrDefault(variant.getId(), Map.of()));
                })
                .toList();

        List<String> attributes = attributeNames.values().stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();
        return ProductImportTemplate.build(attributes, branches.stream().map(Branch::getName).toList(), rows);
    }

    @Override
    public ProductImportResult preview(String filename, byte[] content) {
        return analyze(filename, content).toResult(false);
    }

    @Override
    @Transactional
    public ProductImportResult importProducts(String filename, byte[] content) {
        Analysis analysis = analyze(filename, content);
        if (!analysis.isValid()) {
            return analysis.toResult(false);
        }
        apply(analysis);
        return analysis.toResult(true);
    }

    // ---------------------------------------------------------------- análisis

    private Analysis analyze(String filename, byte[] content) {
        Analysis analysis = new Analysis();
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        SheetData sheet;
        try {
            sheet = SpreadsheetReader.read(filename, content, ProductImportTemplate.PRODUCTS_SHEET, MAX_ROWS);
        } catch (UnreadableFileException e) {
            analysis.fileErrors.add(e.getMessage());
            return analysis;
        }

        List<Branch> branches = activeBranches(companyId);
        Columns columns = mapColumns(sheet.headers(), branches, analysis.fileErrors);
        if (sheet.rows().isEmpty()) {
            analysis.fileErrors.add("El archivo no tiene filas con datos debajo de los encabezados.");
        }
        if (!analysis.fileErrors.isEmpty()) {
            return analysis;
        }
        columns.attributes().forEach(column -> analysis.attributeNames.put(column.key(), column.name()));

        for (SheetRow sheetRow : sheet.rows()) {
            analysis.rows.add(readRow(sheetRow, columns));
        }
        markRepeatedInFile(analysis.rows);

        loadCatalog(analysis, companyId);
        Context context = loadContext(analysis.rows, branches, companyId);

        for (ImportRow row : analysis.rows) {
            row.existing = row.sku == null ? null : context.variantsBySku.get(row.sku);
            if (row.existing != null) {
                checkUpdate(row, analysis, context);
            } else {
                checkCreate(row, context);
            }
        }

        groupNewProducts(analysis, context);
        generateSkus(analysis, companyId);
        return analysis;
    }

    private Columns mapColumns(List<String> headers, List<Branch> branches, List<String> fileErrors) {
        Map<String, Branch> branchesByKey = new HashMap<>();
        branches.forEach(branch -> branchesByKey.put(SearchText.normalize(branch.getName()), branch));

        int product = -1, description = -1, category = -1, sku = -1, barcode = -1, price = -1;
        List<AttributeColumn> attributes = new ArrayList<>();
        List<StockColumn> stocks = new ArrayList<>();
        Set<String> seen = new HashSet<>();

        for (int i = 0; i < headers.size(); i++) {
            String header = collapse(headers.get(i));
            String key = SearchText.normalize(header);
            if (key == null) {
                continue;
            }
            if (!seen.add(key)) {
                fileErrors.add("La columna \"%s\" está repetida.".formatted(header));
                continue;
            }
            // Los nombres de las columnas los define la plantilla: así lo que descarga se lee igual.
            FixedColumn fixed = FixedColumn.ofKey(key);
            if (fixed != null) {
                switch (fixed) {
                    case PRODUCT -> product = i;
                    case DESCRIPTION -> description = i;
                    case CATEGORY -> category = i;
                    case SKU -> sku = i;
                    case BARCODE -> barcode = i;
                    case PRICE -> price = i;
                }
            } else if (ProductImportTemplate.isStockKey(key)) {
                String branchKey = key.substring(ProductImportTemplate.STOCK_KEY.length()).trim();
                Branch branch = branchesByKey.get(branchKey);
                if (branchKey.isEmpty()) {
                    fileErrors.add("La columna \"Stock\" tiene que decir de qué sucursal es: \"Stock <sucursal>\".");
                } else if (branch == null) {
                    fileErrors.add("La columna \"%s\" no coincide con ninguna sucursal activa.".formatted(header));
                } else {
                    stocks.add(new StockColumn(i, branch));
                }
            } else if (header.length() > 100) {
                fileErrors.add("El encabezado \"%s\" es demasiado largo para un atributo.".formatted(header));
            } else {
                attributes.add(new AttributeColumn(i, header, key));
            }
        }

        if (product < 0) {
            fileErrors.add("Falta la columna \"Producto\". La primera fila tiene que tener los encabezados de la plantilla.");
        }
        return new Columns(product, description, category, sku, barcode, price, attributes, stocks);
    }

    private ImportRow readRow(SheetRow sheetRow, Columns columns) {
        ImportRow row = new ImportRow(sheetRow.number());
        row.product = text(sheetRow, columns.product());
        row.productKey = SearchText.normalize(row.product);
        row.description = text(sheetRow, columns.description());
        row.category = text(sheetRow, columns.category());
        String sku = text(sheetRow, columns.sku());
        row.sku = sku == null ? null : sku.toUpperCase(Locale.ROOT);
        row.barcode = text(sheetRow, columns.barcode());

        checkLength(row, row.product, 100, "El nombre del producto");
        checkLength(row, row.description, 500, "La descripción");
        checkLength(row, row.category, 100, "La categoría");
        checkLength(row, row.sku, 50, "El SKU");
        checkLength(row, row.barcode, 64, "El código de barras");

        SheetCell priceCell = sheetRow.cell(columns.price());
        row.priceGiven = !priceCell.isBlank();
        if (row.priceGiven) {
            BigDecimal price = parseNumber(priceCell);
            if (price == null) {
                row.errors.add("El precio \"%s\" no es un número.".formatted(priceCell.text()));
            } else if (price.signum() <= 0) {
                row.errors.add("El precio tiene que ser mayor a $0.");
            } else if (price.stripTrailingZeros().scale() > 2) {
                row.errors.add("El precio tiene más de 2 decimales.");
            } else if (price.compareTo(MAX_PRICE) >= 0) {
                row.errors.add("El precio es demasiado alto.");
            } else {
                row.price = price.setScale(2);
            }
        }

        for (AttributeColumn column : columns.attributes()) {
            String value = text(sheetRow, column.index());
            if (value != null) {
                checkLength(row, value, 100, "El valor de " + column.name());
                row.attributes.put(column.key(), value);
            }
        }

        for (StockColumn column : columns.stocks()) {
            SheetCell cell = sheetRow.cell(column.index());
            if (cell.isBlank()) {
                continue;
            }
            BigDecimal quantity = parseNumber(cell);
            if (quantity == null
                    || quantity.signum() < 0
                    || quantity.stripTrailingZeros().scale() > 0
                    || quantity.compareTo(BigDecimal.valueOf(Integer.MAX_VALUE)) > 0) {
                row.errors.add("El stock de %s tiene que ser un número entero, 0 o mayor."
                        .formatted(column.branch().getName()));
            } else {
                row.stock.put(column.branch().getId(), quantity.intValueExact());
            }
        }
        return row;
    }

    /** SKU y código de barras son únicos: el archivo no los puede repetir. */
    private static void markRepeatedInFile(List<ImportRow> rows) {
        Map<String, Integer> skuRows = new HashMap<>();
        Map<String, Integer> barcodeRows = new HashMap<>();
        for (ImportRow row : rows) {
            if (row.sku != null) {
                Integer first = skuRows.putIfAbsent(row.sku, row.number);
                if (first != null) {
                    row.errors.add("El SKU %s ya está en la fila %d.".formatted(row.sku, first));
                }
            }
            if (row.barcode != null) {
                Integer first = barcodeRows.putIfAbsent(row.barcode, row.number);
                if (first != null) {
                    row.errors.add("El código de barras %s ya está en la fila %d.".formatted(row.barcode, first));
                }
            }
        }
    }

    /** Categorías, atributos y valores de la empresa por nombre normalizado (gana el activo). */
    private void loadCatalog(Analysis analysis, Long companyId) {
        for (Category category : categoryRepository.findByCompanyId(companyId)) {
            analysis.categories.merge(SearchText.normalize(category.getName()), category,
                    (current, other) -> current.isActive() ? current : other);
        }
        for (ProductAttribute attribute : attributeRepository.findByCompanyId(companyId)) {
            analysis.attributes.merge(SearchText.normalize(attribute.getName()), attribute,
                    (current, other) -> current.isActive() ? current : other);
        }
        for (ProductAttributeValue value : attributeValueRepository.findAllByCompanyIdWithAttribute(companyId, null)) {
            analysis.values
                    .computeIfAbsent(SearchText.normalize(value.getAttribute().getName()), key -> new HashMap<>())
                    .merge(SearchText.normalize(value.getValue()), value,
                            (current, other) -> current.isActive() ? current : other);
        }
    }

    private Context loadContext(List<ImportRow> rows, List<Branch> branches, Long companyId) {
        Context context = new Context();
        context.canEditPrices = SecurityUtils.hasAuthority(Permission.ADMINISTRAR_PRECIOS.name());
        context.canCreateCategories = SecurityUtils.hasAuthority(Permission.ADMINISTRAR_CATEGORIAS.name());
        context.accessibleBranchIds = new HashSet<>(branchAccessService.accessibleBranchIds());
        branches.forEach(branch -> context.branchesById.put(branch.getId(), branch));

        Set<String> skus = rows.stream().map(row -> row.sku).filter(Objects::nonNull).collect(Collectors.toSet());
        if (!skus.isEmpty()) {
            variantRepository.findByCompanyIdAndUpperSkuIn(companyId, skus)
                    .forEach(variant -> context.variantsBySku.put(variant.getSku().toUpperCase(Locale.ROOT), variant));
        }

        Set<String> barcodes = rows.stream().map(row -> row.barcode).filter(Objects::nonNull).collect(Collectors.toSet());
        if (!barcodes.isEmpty()) {
            variantRepository.findByCompanyIdAndBarcodeIn(companyId, barcodes)
                    .forEach(variant -> context.variantsByBarcode.put(variant.getBarcode(), variant));
        }

        if (!context.variantsBySku.isEmpty()) {
            List<Long> variantIds = context.variantsBySku.values().stream().map(ProductVariant::getId).toList();
            for (Stock stock : stockRepository.findByProductVariantIdInAndCompanyId(variantIds, companyId)) {
                context.stock.put(stockKey(stock.getProductVariant().getId(), stock.getBranch().getId()), stock.getQuantity());
            }
        }

        productRepository.findNamesByCompanyId(companyId)
                .forEach(name -> context.productNameKeys.add(SearchText.normalize(name)));
        return context;
    }

    /** Fila con un SKU que ya existe: cambia precio, código de barras y stock; nada más. */
    private void checkUpdate(ImportRow row, Analysis analysis, Context context) {
        ProductVariant variant = row.existing;
        Product product = variant.getProduct();
        row.finalSku = variant.getSku();

        if (!variant.isActive()) {
            row.errors.add("El SKU %s está desactivado en \"%s\".".formatted(variant.getSku(), product.getName()));
        }
        if (row.productKey != null && !row.productKey.equals(SearchText.normalize(product.getName()))) {
            row.errors.add("El SKU %s es del producto \"%s\".".formatted(variant.getSku(), product.getName()));
        }

        Map<String, String> currentValues = new HashMap<>();
        variant.getAttributes().forEach(pva -> currentValues.put(
                SearchText.normalize(pva.getAttributeValue().getAttribute().getName()),
                SearchText.normalize(pva.getAttributeValue().getValue())));
        row.attributes.forEach((attributeKey, value) -> {
            if (!Objects.equals(currentValues.get(attributeKey), SearchText.normalize(value))) {
                row.errors.add("El SKU %s no tiene %s: %s.".formatted(
                        variant.getSku(), analysis.attributeNames.get(attributeKey), value));
            }
        });

        if (!product.getCategory().isActive()) {
            row.errors.add("La categoría \"%s\" del producto está desactivada: activala para poder actualizarlo."
                    .formatted(product.getCategory().getName()));
        }

        if (row.price != null && row.price.compareTo(variant.getPrice()) != 0) {
            if (context.canEditPrices) {
                row.changes.add("Precio: %s → %s".formatted(money(variant.getPrice()), money(row.price)));
            } else {
                row.errors.add("Cambiar el precio requiere el permiso \"Administrar precios\".");
            }
        }

        if (row.barcode != null && !row.barcode.equals(variant.getBarcode())) {
            ProductVariant owner = context.variantsByBarcode.get(row.barcode);
            if (owner != null && !owner.getId().equals(variant.getId())) {
                row.errors.add("El código de barras %s ya lo usa el SKU %s.".formatted(row.barcode, owner.getSku()));
            } else {
                row.changes.add("Código de barras: %s → %s".formatted(
                        variant.getBarcode() == null ? "sin código" : variant.getBarcode(), row.barcode));
            }
        }

        row.stock.forEach((branchId, quantity) -> {
            int current = context.stock.getOrDefault(stockKey(variant.getId(), branchId), 0);
            if (current == quantity) {
                return;
            }
            Branch branch = context.branchesById.get(branchId);
            if (context.accessibleBranchIds.contains(branchId)) {
                row.changes.add("Stock %s: %d → %d".formatted(branch.getName(), current, quantity));
            } else {
                row.errors.add("No tenés asignada la sucursal \"%s\" para cambiar su stock.".formatted(branch.getName()));
            }
        });
    }

    /** Fila de una variante nueva. Lo que depende del producto entero se ve en groupNewProducts. */
    private void checkCreate(ImportRow row, Context context) {
        row.finalSku = row.sku;

        if (!context.canEditPrices) {
            row.errors.add("Crear productos requiere el permiso \"Administrar precios\".");
        }
        if (row.product == null) {
            row.errors.add("Falta el nombre del producto.");
        }
        if (row.category == null) {
            row.errors.add("Falta la categoría.");
        }
        if (!row.priceGiven) {
            row.errors.add("Falta el precio.");
        }
        if (row.barcode != null && context.variantsByBarcode.containsKey(row.barcode)) {
            row.errors.add("El código de barras %s ya lo usa el SKU %s."
                    .formatted(row.barcode, context.variantsByBarcode.get(row.barcode).getSku()));
        }
        row.stock.forEach((branchId, quantity) -> {
            if (quantity > 0 && !context.accessibleBranchIds.contains(branchId)) {
                row.errors.add("No tenés asignada la sucursal \"%s\" para cargar stock."
                        .formatted(context.branchesById.get(branchId).getName()));
            }
        });
    }

    /** Las filas nuevas con el mismo nombre forman un producto: misma categoría y atributos distintos. */
    private void groupNewProducts(Analysis analysis, Context context) {
        for (ImportRow row : analysis.rows) {
            if (row.existing == null && row.productKey != null) {
                analysis.newProducts.computeIfAbsent(row.productKey, key -> new NewProduct(row.product)).rows.add(row);
            }
        }

        analysis.newProducts.forEach((productKey, product) -> {
            List<ImportRow> rows = product.rows;
            ImportRow first = rows.getFirst();

            rows.stream().map(row -> row.description).filter(Objects::nonNull).findFirst()
                    .ifPresent(description -> product.description = description);
            rows.stream().filter(row -> row.category != null).findFirst().ifPresent(row -> {
                product.categoryKey = SearchText.normalize(row.category);
                product.categoryName = row.category;
            });

            Map<String, Integer> combinations = new HashMap<>();
            for (ImportRow row : rows) {
                if (row.category != null && !SearchText.normalize(row.category).equals(product.categoryKey)) {
                    row.errors.add("\"%s\" tiene la categoría \"%s\" en otra fila.".formatted(product.name, product.categoryName));
                }
                if (rows.size() > 1 && row.attributes.isEmpty()) {
                    row.errors.add("\"%s\" tiene varias filas: cada una necesita al menos un atributo (Talle, Color…)."
                            .formatted(product.name));
                }
                if (!row.attributes.isEmpty()) {
                    Integer previous = combinations.putIfAbsent(combinationKey(row), row.number);
                    if (previous != null) {
                        row.errors.add("Repite los atributos de la fila %d del mismo producto.".formatted(previous));
                    }
                }
                checkAttributes(row, analysis);
            }

            if (context.productNameKeys.contains(productKey)) {
                first.warnings.add("Ya existe un producto \"%s\": se va a crear otro con el mismo nombre."
                        .formatted(product.name));
            }
            checkCategory(product, analysis, context);
        });
    }

    private void checkCategory(NewProduct product, Analysis analysis, Context context) {
        if (product.categoryKey == null) {
            return;
        }
        Category category = analysis.categories.get(product.categoryKey);
        if (category != null && !category.isActive()) {
            product.rows.forEach(row -> row.errors.add("La categoría \"%s\" está desactivada.".formatted(category.getName())));
        } else if (category == null && !context.canCreateCategories) {
            product.rows.forEach(row -> row.errors.add(
                    "La categoría \"%s\" no existe y crearla requiere el permiso \"Administrar categorías\"."
                            .formatted(product.categoryName)));
        } else if (category == null) {
            analysis.categoriesToCreate.putIfAbsent(product.categoryKey, product.categoryName);
        }
    }

    private void checkAttributes(ImportRow row, Analysis analysis) {
        row.attributes.forEach((attributeKey, value) -> {
            ProductAttribute attribute = analysis.attributes.get(attributeKey);
            if (attribute != null && !attribute.isActive()) {
                row.errors.add("El atributo \"%s\" está desactivado.".formatted(attribute.getName()));
                return;
            }
            String valueKey = SearchText.normalize(value);
            ProductAttributeValue existing = attribute == null
                    ? null
                    : analysis.values.getOrDefault(attributeKey, Map.of()).get(valueKey);
            if (existing != null && !existing.isActive()) {
                row.errors.add("El valor \"%s\" de %s está desactivado.".formatted(existing.getValue(), attribute.getName()));
            } else if (existing == null) {
                analysis.valuesToCreate.computeIfAbsent(attributeKey, key -> new LinkedHashMap<>()).putIfAbsent(valueKey, value);
            }
        });
    }

    /** Los SKU vacíos de variantes nuevas: únicos contra la empresa y contra el resto del archivo. */
    private void generateSkus(Analysis analysis, Long companyId) {
        Set<String> taken = variantRepository.findSkusByCompanyId(companyId).stream()
                .map(sku -> sku.toUpperCase(Locale.ROOT))
                .collect(Collectors.toCollection(HashSet::new));
        analysis.rows.stream().map(row -> row.sku).filter(Objects::nonNull).forEach(taken::add);

        for (NewProduct product : analysis.newProducts.values()) {
            for (ImportRow row : product.rows) {
                if (row.sku == null) {
                    String base = Skus.base(product.name, new ArrayList<>(row.attributes.values()));
                    row.finalSku = Skus.firstFree(base, taken::contains);
                    taken.add(row.finalSku);
                }
            }
        }
    }

    // ---------------------------------------------------------------- guardado

    private void apply(Analysis analysis) {
        Map<String, Long> categoryIds = new HashMap<>();
        analysis.categories.forEach((key, category) -> categoryIds.put(key, category.getId()));
        analysis.categoriesToCreate.forEach((key, name) ->
                categoryIds.put(key, categoryService.create(new CategoryRequest(name, null)).id()));

        Map<String, Long> attributeIds = new HashMap<>();
        analysis.attributes.forEach((key, attribute) -> attributeIds.put(key, attribute.getId()));
        Map<String, Map<String, Long>> valueIds = new HashMap<>();
        analysis.values.forEach((attributeKey, values) -> values.forEach((valueKey, value) ->
                valueIds.computeIfAbsent(attributeKey, key -> new HashMap<>()).put(valueKey, value.getId())));

        analysis.valuesToCreate.forEach((attributeKey, values) -> {
            Long attributeId = attributeIds.computeIfAbsent(attributeKey, key ->
                    attributeService.create(new ProductAttributeRequest(analysis.attributeNames.get(key))).id());
            values.forEach((valueKey, value) -> valueIds
                    .computeIfAbsent(attributeKey, key -> new HashMap<>())
                    .put(valueKey, attributeService.addValue(attributeId, new ProductAttributeValueRequest(value)).id()));
        });

        for (NewProduct product : analysis.newProducts.values()) {
            List<ProductVariantRequest> variants = product.rows.stream()
                    .map(row -> new ProductVariantRequest(
                            row.finalSku,
                            row.price,
                            row.barcode,
                            row.attributes.entrySet().stream()
                                    .map(entry -> valueIds.get(entry.getKey()).get(SearchText.normalize(entry.getValue())))
                                    .toList(),
                            row.stock.entrySet().stream()
                                    .map(entry -> new InitialStockRequest(entry.getKey(), entry.getValue()))
                                    .toList()))
                    .toList();
            productService.create(new ProductRequest(
                    product.name, product.description, categoryIds.get(product.categoryKey), variants));
        }

        applyUpdates(analysis);
    }

    /*
     * La edición de ProductService recibe el producto entero (desactiva las variantes que no
     * vienen): se mandan todas sus variantes activas, con lo del archivo en las que tienen fila.
     */
    private void applyUpdates(Analysis analysis) {
        Map<Long, Map<Long, ImportRow>> rowsByProduct = new LinkedHashMap<>();
        for (ImportRow row : analysis.rows) {
            if (row.action() == ProductImportAction.UPDATE) {
                rowsByProduct
                        .computeIfAbsent(row.existing.getProduct().getId(), key -> new HashMap<>())
                        .put(row.existing.getId(), row);
            }
        }
        if (rowsByProduct.isEmpty()) {
            return;
        }

        Map<Long, List<ProductVariant>> variantsByProduct = variantRepository
                .findByProductIdInWithAttributes(rowsByProduct.keySet()).stream()
                .collect(Collectors.groupingBy(variant -> variant.getProduct().getId()));

        rowsByProduct.forEach((productId, rowsByVariant) -> {
            Product product = rowsByVariant.values().iterator().next().existing.getProduct();
            List<ProductVariantUpdateRequest> variants = variantsByProduct.get(productId).stream()
                    .filter(ProductVariant::isActive)
                    .map(variant -> toUpdateRequest(variant, rowsByVariant.get(variant.getId())))
                    .toList();
            productService.update(productId, new ProductUpdateRequest(
                    product.getName(), product.getDescription(), product.getCategory().getId(), variants));
        });
    }

    private static ProductVariantUpdateRequest toUpdateRequest(ProductVariant variant, ImportRow row) {
        List<Long> valueIds = variant.getAttributes().stream()
                .map(pva -> pva.getAttributeValue().getId())
                .toList();
        if (row == null) {
            return new ProductVariantUpdateRequest(variant.getSku(), variant.getPrice(), variant.getBarcode(), valueIds, List.of());
        }
        return new ProductVariantUpdateRequest(
                variant.getSku(),
                row.price != null ? row.price : variant.getPrice(),
                row.barcode != null ? row.barcode : variant.getBarcode(),
                valueIds,
                row.stock.entrySet().stream()
                        .map(entry -> new ProductVariantStockRequest(entry.getKey(), entry.getValue()))
                        .toList());
    }

    // ---------------------------------------------------------------- utilidades

    private List<Branch> activeBranches(Long companyId) {
        return branchRepository.findByCompanyIdAndActive(companyId, true).stream()
                .sorted(Comparator.comparing(Branch::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private static String text(SheetRow row, int column) {
        String value = collapse(row.cell(column).text());
        return value.isEmpty() ? null : value;
    }

    private static String collapse(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private static void checkLength(ImportRow row, String value, int max, String label) {
        if (value != null && value.length() > max) {
            row.errors.add("%s supera los %d caracteres.".formatted(label, max));
        }
    }

    private static String combinationKey(ImportRow row) {
        return row.attributes.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + SearchText.normalize(entry.getValue()))
                .sorted()
                .collect(Collectors.joining("|"));
    }

    private static String stockKey(Long variantId, Long branchId) {
        return variantId + ":" + branchId;
    }

    private static String money(BigDecimal value) {
        NumberFormat format = NumberFormat.getNumberInstance(Locale.forLanguageTag("es-AR"));
        format.setMinimumFractionDigits(0);
        format.setMaximumFractionDigits(2);
        return "$" + format.format(value);
    }

    /** null si no es un número. Las celdas numéricas de Excel ya vienen sin separadores de miles. */
    static BigDecimal parseNumber(SheetCell cell) {
        try {
            return cell.numeric() ? new BigDecimal(cell.text()) : parseTypedNumber(cell.text());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /*
     * Lo que se escribe a mano: "1500", "1500,50", "1.500", "1.500,50", "$ 1500" o "1,500.50".
     * Con los dos separadores, el último es el decimal. Con solo coma, es decimal (salvo varias:
     * "1,500,000"). Con solo punto, es de miles si hay varios o si le siguen 3 cifras ("1.500").
     */
    static BigDecimal parseTypedNumber(String raw) {
        String value = raw.replace("$", "").replaceAll("\\s", "");
        int lastComma = value.lastIndexOf(',');
        int lastDot = value.lastIndexOf('.');
        if (lastComma >= 0 && lastDot >= 0) {
            boolean commaIsDecimal = lastComma > lastDot;
            value = commaIsDecimal
                    ? value.replace(".", "").replace(',', '.')
                    : value.replace(",", "");
        } else if (lastComma >= 0) {
            value = value.indexOf(',') != lastComma ? value.replace(",", "") : value.replace(',', '.');
        } else if (lastDot >= 0 && (value.indexOf('.') != lastDot || value.length() - lastDot - 1 == 3)) {
            value = value.replace(".", "");
        }
        return new BigDecimal(value);
    }

    // ---------------------------------------------------------------- estado del análisis

    private record AttributeColumn(int index, String name, String key) {}

    private record StockColumn(int index, Branch branch) {}

    /** Índice de cada columna fija; -1 si el archivo no la trae. */
    private record Columns(int product, int description, int category, int sku, int barcode, int price,
                           List<AttributeColumn> attributes, List<StockColumn> stocks) {}

    /** Lo que se consulta una vez por archivo. */
    private static final class Context {
        boolean canEditPrices;
        boolean canCreateCategories;
        Set<Long> accessibleBranchIds = Set.of();
        final Map<Long, Branch> branchesById = new HashMap<>();
        /** SKU en mayúsculas → variante. */
        final Map<String, ProductVariant> variantsBySku = new HashMap<>();
        final Map<String, ProductVariant> variantsByBarcode = new HashMap<>();
        /** "variante:sucursal" → cantidad. */
        final Map<String, Integer> stock = new HashMap<>();
        final Set<String> productNameKeys = new HashSet<>();
    }

    private static final class ImportRow {
        final int number;
        String product;
        String productKey;
        String description;
        String category;
        /** En mayúsculas; null si vino vacío. */
        String sku;
        String barcode;
        boolean priceGiven;
        BigDecimal price;
        /** Clave del atributo → valor como vino, en el orden de las columnas. */
        final Map<String, String> attributes = new LinkedHashMap<>();
        /** Sucursal → cantidad final. */
        final Map<Long, Integer> stock = new LinkedHashMap<>();
        ProductVariant existing;
        String finalSku;
        final List<String> changes = new ArrayList<>();
        final List<String> errors = new ArrayList<>();
        final List<String> warnings = new ArrayList<>();

        ImportRow(int number) {
            this.number = number;
        }

        ProductImportAction action() {
            if (!errors.isEmpty()) {
                return ProductImportAction.ERROR;
            }
            if (existing == null) {
                return ProductImportAction.CREATE;
            }
            return changes.isEmpty() ? ProductImportAction.UNCHANGED : ProductImportAction.UPDATE;
        }
    }

    private static final class NewProduct {
        final String name;
        String description;
        String categoryKey;
        String categoryName;
        final List<ImportRow> rows = new ArrayList<>();

        NewProduct(String name) {
            this.name = name;
        }
    }

    private static final class Analysis {
        final List<String> fileErrors = new ArrayList<>();
        final List<ImportRow> rows = new ArrayList<>();
        /** Clave del atributo → nombre como está en el encabezado. */
        final Map<String, String> attributeNames = new HashMap<>();
        final Map<String, NewProduct> newProducts = new LinkedHashMap<>();
        final Map<String, Category> categories = new HashMap<>();
        final Map<String, String> categoriesToCreate = new LinkedHashMap<>();
        final Map<String, ProductAttribute> attributes = new HashMap<>();
        final Map<String, Map<String, ProductAttributeValue>> values = new HashMap<>();
        /** Clave del atributo → (clave del valor → valor como vino). */
        final Map<String, Map<String, String>> valuesToCreate = new LinkedHashMap<>();

        boolean isValid() {
            return fileErrors.isEmpty() && !rows.isEmpty() && rows.stream().allMatch(row -> row.errors.isEmpty());
        }

        ProductImportResult toResult(boolean applied) {
            List<ProductImportRow> rowResults = rows.stream()
                    .map(row -> new ProductImportRow(
                            row.number,
                            row.action(),
                            row.product != null || row.existing == null ? row.product : row.existing.getProduct().getName(),
                            row.finalSku,
                            List.copyOf(row.changes),
                            List.copyOf(row.errors),
                            List.copyOf(row.warnings)))
                    .toList();

            List<String> attributesSummary = new ArrayList<>();
            valuesToCreate.forEach((attributeKey, newValues) -> {
                ProductAttribute attribute = attributes.get(attributeKey);
                String name = attribute != null ? attribute.getName() : attributeNames.get(attributeKey) + " (atributo nuevo)";
                attributesSummary.add(name + ": " + String.join(", ", newValues.values()));
            });

            return new ProductImportResult(
                    isValid(),
                    applied,
                    rows.size(),
                    // Como variantsToCreate: no cuenta los productos con todas sus filas con error.
                    (int) newProducts.values().stream()
                            .filter(product -> product.rows.stream().anyMatch(row -> row.errors.isEmpty()))
                            .count(),
                    count(rowResults, ProductImportAction.CREATE),
                    count(rowResults, ProductImportAction.UPDATE),
                    count(rowResults, ProductImportAction.UNCHANGED),
                    count(rowResults, ProductImportAction.ERROR),
                    List.copyOf(categoriesToCreate.values()),
                    attributesSummary,
                    List.copyOf(fileErrors),
                    rowResults);
        }

        private static int count(List<ProductImportRow> rows, ProductImportAction action) {
            return (int) rows.stream().filter(row -> row.action() == action).count();
        }
    }
}
