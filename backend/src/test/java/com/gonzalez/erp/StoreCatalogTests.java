package com.gonzalez.erp;

import com.gonzalez.erp.common.util.BusinessDate;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * Catálogo público contra Postgres real: qué productos se ven (y cuáles no), precio web, orden,
 * búsqueda, paginado, disponibilidad sin cantidad, reglas de fotos y aislamiento entre tiendas.
 * También que solo cuentan las fotos visibles (propias o de variantes activas) para seguir publicado,
 * y qué promos se ven, con su precio web, ahorro y disponibilidad.
 * Las fotos se insertan directo en la base: el test no levanta el almacenamiento.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin"
})
@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StoreCatalogTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

    private static final TimeZone originalTimeZone = TimeZone.getDefault();
    private static final String STORE_A = "catalogo-a.test";
    private static final String STORE_B = "catalogo-b.test";

    // Mismo motivo que en TenantIsolationTests: con la zona de Windows Postgres rechaza la conexión.
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    private final Map<String, Long> ids = new LinkedHashMap<>();
    private String adminA;
    private String adminB;

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @BeforeAll
    void createCatalogs() {
        String platform = login("platform_admin", "test-platform-admin");
        String a = provision(platform, "Catalogo A", "admin_catalogo_a", STORE_A);
        adminA = a;
        String b = provision(platform, "Catalogo B", "admin_catalogo_b", STORE_B);
        adminB = b;

        Long central = id(call(a, "POST", "/branches", Map.of("name", "Central"), STORE_A));
        Long warehouse = id(call(a, "POST", "/branches", Map.of("name", "Deposito"), STORE_A));
        jdbc.update("UPDATE branches SET store_priority = id WHERE id IN (?, ?)", central, warehouse);
        Long size = id(call(a, "POST", "/product-attributes", Map.of("name", "Talle"), STORE_A));
        Long m = id(call(a, "POST", "/product-attributes/" + size + "/values", Map.of("value", "M"), STORE_A));
        Long l = id(call(a, "POST", "/product-attributes/" + size + "/values", Map.of("value", "L"), STORE_A));
        Long shirts = id(call(a, "POST", "/categories", Map.of("name", "Remeras", "attributeIds", List.of(size)), STORE_A));
        Long old = id(call(a, "POST", "/categories", Map.of("name", "Viejas"), STORE_A));
        ids.put("shirts", shirts);
        ids.put("central", central);
        ids.put("sizeM", m);
        ids.put("sizeL", l);

        Long blue = product(a, "Remera Azul", shirts,
                variant(1000, List.of(m), central, 10),
                variant(2000, List.of(l), central, 2));
        Long sweater = product(a, "Buzo Gris", shirts, variant(5000, List.of(m), warehouse, 50));
        Long hidden = product(a, "Remera Oculta", shirts, variant(100, List.of(m), central, 5));
        Long inactive = product(a, "Remera Inactiva", shirts, variant(100, List.of(m), central, 5));
        Long oldCap = product(a, "Gorra Vieja", old, variant(100, List.of(), central, 5));
        ids.put("blue", blue);
        ids.put("sweater", sweater);
        ids.put("hidden", hidden);
        ids.put("inactive", inactive);
        ids.put("oldCap", oldCap);

        Long companyA = jdbc.queryForObject("SELECT company_id FROM products WHERE id = ?", Long.class, blue);
        productImage(companyA, blue, "a.png", 0);
        productImage(companyA, blue, "b.png", 1);
        variantImage(companyA, firstVariant(sweater), "v.png");
        productImage(companyA, inactive, "inactiva.png", 0);
        productImage(companyA, oldCap, "gorra.png", 0);
        for (Long product : List.of(blue, sweater, inactive, oldCap)) {
            ok(call(a, "PATCH", "/products/" + product + "/publication", Map.of("publishedOnline", true), STORE_A));
        }
        ok(call(a, "PATCH", "/products/" + inactive + "/deactivate", null, STORE_A));
        ok(call(a, "PATCH", "/categories/" + old + "/deactivate", null, STORE_A));
        // El stock del Buzo queda solo en una sucursal inactiva: no se puede vender.
        ok(call(a, "PATCH", "/branches/" + warehouse + "/deactivate", null, STORE_A));
        ok(call(a, "PATCH", "/companies/me/store", Map.of("priceAdjustmentPercent", 10, "roundingStep", 10), STORE_A));

        Long branchB = id(call(b, "POST", "/branches", Map.of("name", "Central B"), STORE_B));
        jdbc.update("UPDATE branches SET store_priority = 1 WHERE id = ?", branchB);
        Long categoryB = id(call(b, "POST", "/categories", Map.of("name", "Secreta"), STORE_B));
        Long secret = product(b, "B Secreto", categoryB, variant(999, List.of(), branchB, 5));
        Long companyB = jdbc.queryForObject("SELECT company_id FROM products WHERE id = ?", Long.class, secret);
        productImage(companyB, secret, "secreto.png", 0);
        ok(call(b, "PATCH", "/products/" + secret + "/publication", Map.of("publishedOnline", true), STORE_B));
        ids.put("secret", secret);
        ids.put("categoryB", categoryB);
    }

    @Test
    void onlyActiveCategoriesWithVisibleProductsAreListed() {
        JsonNode categories = ok(store(STORE_A, "/store/categories"));
        assertThat(texts(categories, "name")).containsExactly("Remeras");
        assertThat(texts(ok(store(STORE_B, "/store/categories")), "name")).containsExactly("Secreta");
    }

    @Test
    void onlyVisibleProductsOfTheStoreAreListed() {
        Response response = store(STORE_A, "/store/products");
        JsonNode page = ok(response);
        assertThat(texts(page.get("content"), "name")).containsExactly("Buzo Gris", "Remera Azul");
        assertThat(page.get("totalElements").asLong()).isEqualTo(2);
        assertThat(response.body())
                .doesNotContain("Oculta", "Inactiva", "Vieja", "Secreto", "\"sku\"", "SKU-", "quantity");
    }

    @Test
    void theListingHasWebPricesCoverAndAvailability() {
        Map<String, JsonNode> byName = byName(ok(store(STORE_A, "/store/products")).get("content"));

        JsonNode blue = byName.get("Remera Azul");
        assertThat(decimal(blue, "minPrice")).isEqualByComparingTo("1100");
        assertThat(decimal(blue, "maxPrice")).isEqualByComparingTo("2200");
        assertThat(blue.get("availability").asString()).isEqualTo("AVAILABLE");
        assertThat(blue.get("coverImageUrl").asString()).endsWith("/a.png");

        JsonNode sweater = byName.get("Buzo Gris");
        assertThat(decimal(sweater, "minPrice")).isEqualByComparingTo("5500");
        assertThat(sweater.get("availability").asString()).isEqualTo("OUT_OF_STOCK");
        // Sin fotos propias: la portada es la de su variante.
        assertThat(sweater.get("coverImageUrl").asString()).endsWith("/v.png");
    }

    @Test
    void stockOfABranchOutOfTheStoreIsNotShown() {
        Long central = ids.get("central");
        jdbc.update("UPDATE branches SET store_priority = NULL WHERE id = ?", central);
        try {
            JsonNode blue = byName(ok(store(STORE_A, "/store/products")).get("content")).get("Remera Azul");
            assertThat(blue.get("availability").asString()).isEqualTo("OUT_OF_STOCK");
        } finally {
            jdbc.update("UPDATE branches SET store_priority = id WHERE id = ?", central);
        }
    }

    @Test
    void productsCanBeSortedSearchedFilteredAndPaged() {
        assertThat(names("/store/products?sort=price,asc")).containsExactly("Remera Azul", "Buzo Gris");
        assertThat(names("/store/products?sort=price,desc")).containsExactly("Buzo Gris", "Remera Azul");
        assertThat(names("/store/products?sort=name,desc")).containsExactly("Remera Azul", "Buzo Gris");

        assertThat(names("/store/products?q=" + encode("RÉMERA"))).containsExactly("Remera Azul");
        assertThat(names("/store/products?q=azul")).containsExactly("Remera Azul");
        assertThat(names("/store/products?q=oculta")).isEmpty();

        assertThat(names("/store/products?categoryId=" + ids.get("shirts"))).hasSize(2);
        // La categoría de otra tienda no trae nada (y no da error).
        assertThat(names("/store/products?categoryId=" + ids.get("categoryB"))).isEmpty();

        JsonNode secondPage = ok(store(STORE_A, "/store/products?size=1&page=1"));
        assertThat(texts(secondPage.get("content"), "name")).containsExactly("Remera Azul");
        assertThat(secondPage.get("totalPages").asInt()).isEqualTo(2);
    }

    @Test
    void theDetailHasVariantsAttributesPricesImagesAndAvailability() {
        JsonNode blue = ok(store(STORE_A, "/store/products/" + ids.get("blue")));
        assertThat(urls(blue.get("images"))).satisfiesExactly(
                url -> assertThat(url).endsWith("/a.png"),
                url -> assertThat(url).endsWith("/b.png"));

        JsonNode variants = blue.get("variants");
        assertThat(variants.size()).isEqualTo(2);
        JsonNode first = variants.get(0);
        assertThat(first.get("attributes").get(0).get("name").asString()).isEqualTo("Talle");
        assertThat(first.get("attributes").get(0).get("value").asString()).isEqualTo("M");
        assertThat(decimal(first, "price")).isEqualByComparingTo("1100");
        assertThat(first.get("availability").asString()).isEqualTo("AVAILABLE");
        // Sin fotos propias, la variante muestra las del producto.
        assertThat(urls(first.get("images"))).hasSize(2);
        JsonNode second = variants.get(1);
        assertThat(decimal(second, "price")).isEqualByComparingTo("2200");
        assertThat(second.get("availability").asString()).isEqualTo("LOW_STOCK");

        JsonNode sweater = ok(store(STORE_A, "/store/products/" + ids.get("sweater")));
        assertThat(urls(sweater.get("images"))).singleElement().satisfies(url -> assertThat(url).endsWith("/v.png"));
        assertThat(sweater.get("variants").get(0).get("availability").asString()).isEqualTo("OUT_OF_STOCK");
    }

    @Test
    void hiddenProductsAndProductsOfOtherStoresAreNotFound() {
        assertThat(store(STORE_A, "/store/products/" + ids.get("hidden")).status()).isEqualTo(404);
        assertThat(store(STORE_A, "/store/products/" + ids.get("inactive")).status()).isEqualTo(404);
        assertThat(store(STORE_A, "/store/products/" + ids.get("secret")).status()).isEqualTo(404);
        assertThat(store(STORE_B, "/store/products/" + ids.get("secret")).status()).isEqualTo(200);
    }

    @Test
    void editingAwayTheOnlyVariantWithImagesUnpublishesTheProduct() {
        Long shirts = ids.get("shirts");
        Long product = product(adminA, "Remera Temporal", shirts,
                variant(1500, List.of(ids.get("sizeM")), ids.get("central"), 3),
                variant(1500, List.of(ids.get("sizeL")), ids.get("central"), 3));
        Long companyA = jdbc.queryForObject("SELECT company_id FROM products WHERE id = ?", Long.class, product);
        Long withImage = jdbc.queryForObject("SELECT MAX(id) FROM product_variants WHERE product_id = ?", Long.class, product);
        String keptSku = jdbc.queryForObject("SELECT sku FROM product_variants WHERE id = ?", String.class, firstVariant(product));
        variantImage(companyA, withImage, "temporal.png");
        ok(call(adminA, "PATCH", "/products/" + product + "/publication", Map.of("publishedOnline", true), null));

        // La edición deja solo la variante sin fotos: la otra se desactiva y su foto deja de verse.
        JsonNode edited = ok(call(adminA, "PATCH", "/products/" + product, Map.of(
                "name", "Remera Temporal", "categoryId", shirts,
                "variants", List.of(Map.of("sku", keptSku, "price", 1500, "attributeValueIds", List.of(ids.get("sizeM"))))),
                null));
        assertThat(edited.get("publishedOnline").asBoolean()).isFalse();

        // La foto sigue en el panel, marcada como no visible, y no alcanza para volver a publicar.
        JsonNode images = ok(call(adminA, "GET", "/products/" + product + "/images", null, null));
        assertThat(images.get(0).get("visibleInStore").asBoolean()).isFalse();
        Response republish = call(adminA, "PATCH", "/products/" + product + "/publication",
                Map.of("publishedOnline", true), null);
        assertThat(republish.status()).isEqualTo(409);
        assertThat(republish.body()).contains("PRODUCT_IMAGE_REQUIRED");
    }

    @Test
    void onlyCurrentPromotionsWithAllTheirProductsVisibleAreListed() {
        LocalDate today = BusinessDate.today();
        Long blue = ids.get("blue");
        // Remera Azul desde $1000 ERP ($1100 web) con 12 unidades; Buzo Gris $5000 ($5500 web) sin stock vendible.
        promotion(adminA, "Combo Buzo", 6000, today.minusDays(3), today.plusDays(10),
                Map.of(blue, 2, ids.get("sweater"), 1));
        promotion(adminA, "Remeras x3", 2000, today, today.plusDays(2), Map.of(blue, 3));
        promotion(adminA, "Con Oculta", 1000, today, today.plusDays(5), Map.of(blue, 1, ids.get("hidden"), 1));
        promotion(adminA, "Con Categoria Vieja", 1000, today, today.plusDays(5), Map.of(blue, 1, ids.get("oldCap"), 1));
        promotion(adminA, "Vencida", 1000, today.minusDays(10), today.minusDays(1), Map.of(blue, 1));
        promotion(adminA, "Programada", 1000, today.plusDays(1), today.plusDays(5), Map.of(blue, 1));
        Long disabled = promotion(adminA, "Desactivada", 1000, today, today.plusDays(5), Map.of(blue, 1));
        ok(call(adminA, "PATCH", "/promotions/" + disabled + "/deactivate", null, null));
        promotion(adminB, "Promo B", 500, today, today.plusDays(5), Map.of(ids.get("secret"), 1));

        JsonNode promotions = ok(store(STORE_A, "/store/promotions"));
        // Las que vencen antes primero.
        assertThat(texts(promotions, "name")).containsExactly("Remeras x3", "Combo Buzo");
        assertThat(texts(ok(store(STORE_B, "/store/promotions")), "name")).containsExactly("Promo B");

        Map<String, JsonNode> byName = byName(promotions);
        JsonNode shirts = byName.get("Remeras x3");
        assertThat(decimal(shirts, "webPrice")).isEqualByComparingTo("2200");
        assertThat(decimal(shirts, "regularWebPrice")).isEqualByComparingTo("3300");
        assertThat(decimal(shirts, "savings")).isEqualByComparingTo("1100");
        assertThat(shirts.get("availability").asString()).isEqualTo("AVAILABLE");
        assertThat(shirts.get("endDate").asString()).isEqualTo(today.plusDays(2).toString());
        JsonNode item = shirts.get("items").get(0);
        assertThat(item.get("productName").asString()).isEqualTo("Remera Azul");
        assertThat(item.get("quantity").asInt()).isEqualTo(3);
        assertThat(item.get("coverImageUrl").asString()).endsWith("/a.png");

        // 2 × 1100 + 5500 = 7700 por separado contra $6600; el Buzo no tiene stock vendible.
        JsonNode combo = byName.get("Combo Buzo");
        assertThat(decimal(combo, "webPrice")).isEqualByComparingTo("6600");
        assertThat(decimal(combo, "savings")).isEqualByComparingTo("1100");
        assertThat(combo.get("availability").asString()).isEqualTo("OUT_OF_STOCK");

        // Nada del ERP: ni el precio ERP, ni fechas de inicio, ni estado.
        assertThat(combo.properties().stream().map(Map.Entry::getKey).toList()).containsExactlyInAnyOrder(
                "id", "name", "description", "webPrice", "regularWebPrice", "savings", "availability", "endDate", "items");
    }

    @Test
    void invalidPagingOrSortingIsRejected() {
        assertThat(store(STORE_A, "/store/products?sort=sku,asc").hasCode("INVALID_PRODUCT_QUERY")).isTrue();
        assertThat(store(STORE_A, "/store/products?size=100").hasCode("INVALID_PRODUCT_QUERY")).isTrue();
    }

    @SafeVarargs
    private Long product(String token, String name, Long categoryId, Map<String, Object>... variants) {
        JsonNode created = ok(call(token, "POST", "/products",
                Map.of("name", name, "categoryId", categoryId, "variants", List.of(variants)), null));
        return created.get("id").asLong();
    }

    private Long promotion(String token, String name, int price, LocalDate start, LocalDate end, Map<Long, Integer> items) {
        List<Map<String, Object>> itemRequests = items.entrySet().stream()
                .map(entry -> Map.<String, Object>of("productId", entry.getKey(), "quantity", entry.getValue()))
                .toList();
        return id(call(token, "POST", "/promotions", Map.of("name", name, "price", price,
                "startDate", start.toString(), "endDate", end.toString(), "items", itemRequests), null));
    }

    private static Map<String, Object> variant(int price, List<Long> valueIds, Long branchId, int quantity) {
        return Map.of("price", price, "attributeValueIds", valueIds,
                "initialStock", List.of(Map.of("branchId", branchId, "quantity", quantity)));
    }

    private Long firstVariant(Long productId) {
        return jdbc.queryForObject("SELECT MIN(id) FROM product_variants WHERE product_id = ?", Long.class, productId);
    }

    private void productImage(Long companyId, Long productId, String file, int order) {
        jdbc.update("""
                INSERT INTO product_images (id, company_id, product_id, storage_key, sort_order, created_at, updated_at)
                VALUES (nextval('product_images_seq'), ?, ?, ?, ?, now(), now())
                """, companyId, productId, "companies/" + companyId + "/products/" + productId + "/" + file, order);
    }

    private void variantImage(Long companyId, Long variantId, String file) {
        jdbc.update("""
                INSERT INTO product_images (id, company_id, product_variant_id, storage_key, sort_order, created_at, updated_at)
                VALUES (nextval('product_images_seq'), ?, ?, ?, 0, now(), now())
                """, companyId, variantId, "companies/" + companyId + "/variants/" + variantId + "/" + file);
    }

    private String provision(String platform, String companyName, String admin, String domain) {
        JsonNode created = ok(call(platform, "POST", "/provisioning/companies", Map.of(
                "companyName", companyName, "adminUsername", admin, "adminEmail", admin + "@x.com"), null));
        ok(call(platform, "PATCH", "/provisioning/companies/" + created.get("companyId").asLong() + "/store",
                Map.of("storeDomain", domain, "storeEnabled", true), null));
        return login(admin, created.get("temporaryPassword").asString());
    }

    private List<String> names(String path) {
        return texts(ok(store(STORE_A, path)).get("content"), "name");
    }

    private static List<String> texts(JsonNode array, String field) {
        List<String> values = new ArrayList<>();
        for (int i = 0; i < array.size(); i++) {
            values.add(array.get(i).get(field).asString());
        }
        return values;
    }

    private static List<String> urls(JsonNode array) {
        List<String> values = new ArrayList<>();
        for (int i = 0; i < array.size(); i++) {
            values.add(array.get(i).asString());
        }
        return values;
    }

    private static Map<String, JsonNode> byName(JsonNode array) {
        Map<String, JsonNode> result = new LinkedHashMap<>();
        for (int i = 0; i < array.size(); i++) {
            result.put(array.get(i).get("name").asString(), array.get(i));
        }
        return result;
    }

    private static BigDecimal decimal(JsonNode node, String field) {
        return new BigDecimal(node.get(field).asString());
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private record Response(int status, String body) {
        boolean hasCode(String code) {
            return status >= 400 && status < 500 && body.contains("\"code\":\"" + code + "\"");
        }

        @Override
        public String toString() {
            return status + " " + body;
        }
    }

    private Response store(String domain, String path) {
        return call(null, "GET", path, null, domain);
    }

    private String login(String username, String password) {
        return ok(call(null, "POST", "/auth/login", Map.of("username", username, "password", password), null))
                .get("token").asString();
    }

    private Long id(Response response) {
        return ok(response).get("id").asLong();
    }

    private JsonNode ok(Response response) {
        assertThat(response.status()).as(response.toString()).isBetween(200, 299);
        return response.body().isEmpty() ? json.createObjectNode() : json.readTree(response.body());
    }

    private Response call(String token, String method, String path, Object body, String storeDomain) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                .header("Content-Type", "application/json")
                .method(method, body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        if (storeDomain != null && path.startsWith("/store")) {
            builder.header("X-Store-Domain", storeDomain);
        }
        try {
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body());
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path, e);
        }
    }
}
