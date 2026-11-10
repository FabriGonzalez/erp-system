package com.gonzalez.erp;

import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.security.StoreTokenService;
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
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * Checkout de la tienda contra Postgres real: reserva de stock en la sucursal que corresponde, sin
 * cargo en la cuenta, doble clic con la misma clave, envío desde varias sucursales, carrito
 * cambiado, datos del comprador, tope de compras sin pagar y aislamiento entre compradores y
 * tiendas. Cada test usa su propio producto y comprador: comparten la tienda.
 * Las cuentas de comprador se insertan directo en la base (el registro se prueba en StoreAccountTests).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin"
})
@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StoreCheckoutTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

    private static final TimeZone originalTimeZone = TimeZone.getDefault();
    private static final String STORE_A = "checkout-a.test";
    private static final String STORE_B = "checkout-b.test";

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

    @Autowired
    private StoreAccountRepository accountRepository;

    @Autowired
    private StoreTokenService tokenService;

    private String adminA;
    private Long companyA;
    private Long centro;
    private Long norte;
    private Long category;
    private Long foreignVariant;

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @BeforeAll
    void createStores() {
        String platform = login("platform_admin", "test-platform-admin");
        adminA = provision(platform, "Checkout A", "admin_checkout_a", STORE_A);
        String adminB = provision(platform, "Checkout B", "admin_checkout_b", STORE_B);

        centro = id(call(adminA, "POST", "/branches", Map.of("name", "Centro"), null));
        norte = id(call(adminA, "POST", "/branches", Map.of("name", "Norte"), null));
        jdbc.update("UPDATE branches SET store_priority = 1 WHERE id = ?", centro);
        jdbc.update("UPDATE branches SET store_priority = 2 WHERE id = ?", norte);
        category = id(call(adminA, "POST", "/categories", Map.of("name", "Remeras"), null));
        companyA = jdbc.queryForObject("SELECT company_id FROM branches WHERE id = ?", Long.class, centro);

        Long branchB = id(call(adminB, "POST", "/branches", Map.of("name", "Central B"), null));
        jdbc.update("UPDATE branches SET store_priority = 1 WHERE id = ?", branchB);
        Long categoryB = id(call(adminB, "POST", "/categories", Map.of("name", "Secreta"), null));
        Long companyB = jdbc.queryForObject("SELECT company_id FROM branches WHERE id = ?", Long.class, branchB);
        foreignVariant = publishedVariant(adminB, companyB, categoryB, "B Secreto", Map.of(branchB, 5));
    }

    @Test
    void pickupReservesTheStockOfTheChosenBranchWithoutChargingTheAccount() {
        Long variant = variant("Remera Retiro", Map.of(centro, 5, norte, 5));
        Buyer buyer = buyer("Ana", "1155550001");

        JsonNode order = ok(checkout(buyer, pickup(norte, cart(variant, 2))));

        assertThat(order.get("status").asString()).isEqualTo("PENDING_PAYMENT");
        assertThat(order.get("fulfillment").asString()).isEqualTo("SINGLE_BRANCH");
        assertThat(order.get("pickupBranch").get("id").asLong()).isEqualTo(norte);
        assertThat(new BigDecimal(order.get("total").asString())).isEqualByComparingTo("2000");
        assertThat(order.get("paymentUrl").isNull()).isTrue();
        assertThat(stock(variant, norte)).isEqualTo(3);
        assertThat(stock(variant, centro)).isEqualTo(5);

        Map<String, Object> saved = jdbc.queryForMap(
                "SELECT channel, created_by, stock_reserved, customer_id FROM orders WHERE id = ?", order.get("orderId").asLong());
        assertThat(saved.get("channel")).isEqualTo("WEB");
        assertThat(saved.get("created_by")).isNull();
        assertThat(saved.get("stock_reserved")).isEqualTo(true);
        assertThat(saved.get("customer_id")).isEqualTo(buyer.customerId());
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM stock_movements
                WHERE reference_type = 'ORDER' AND reference_id = ? AND created_by_id IS NULL
                """, Long.class, order.get("orderId").asLong())).isEqualTo(1);
        // La deuda se carga recién cuando se acredita el pago.
        assertThat(jdbc.queryForObject("SELECT COALESCE(SUM(balance), 0) FROM customer_accounts WHERE customer_id = ?",
                BigDecimal.class, buyer.customerId())).isEqualByComparingTo("0");
    }

    @Test
    void theSameCheckoutKeyReturnsTheSameOrderAndReservesOnce() {
        Long variant = variant("Remera Doble Clic", Map.of(centro, 5));
        Buyer buyer = buyer("Bruno", "1155550002");
        Map<String, Object> request = pickup(centro, cart(variant, 1));

        Long first = ok(checkout(buyer, request)).get("orderId").asLong();
        Long second = ok(checkout(buyer, request)).get("orderId").asLong();

        assertThat(second).isEqualTo(first);
        assertThat(stock(variant, centro)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(1);

        // La misma clave usada por otro comprador no le devuelve el pedido ajeno.
        assertThat(checkout(buyer("Intruso", "1155550099"), request).hasCode("CHECKOUT_KEY_IN_USE")).isTrue();
    }

    @Test
    void whenNoBranchHasEverythingItShipsWithoutReservingAndCopiesTheAddress() {
        Long variant = variant("Remera Repartida", Map.of(centro, 1, norte, 1));
        Buyer buyer = buyer("Carla", "1155550003");
        Long address = address(buyer, "Corrientes", "1234", "1043");

        assertThat(checkout(buyer, pickup(centro, cart(variant, 2))).hasCode("PICKUP_NOT_AVAILABLE")).isTrue();

        JsonNode order = ok(checkout(buyer, shipping(address, cart(variant, 2))));

        assertThat(order.get("fulfillment").asString()).isEqualTo("MULTIPLE_BRANCHES");
        assertThat(order.get("pickupBranch").isNull()).isTrue();
        assertThat(new BigDecimal(order.get("shippingCost").asString())).isEqualByComparingTo("0");
        assertThat(stock(variant, centro)).isEqualTo(1);
        assertThat(stock(variant, norte)).isEqualTo(1);
        Long orderId = order.get("orderId").asLong();
        Map<String, Object> saved = jdbc.queryForMap("SELECT branch_id, stock_reserved FROM orders WHERE id = ?", orderId);
        // La primera por prioridad queda como provisoria.
        assertThat(saved.get("branch_id")).isEqualTo(centro);
        assertThat(saved.get("stock_reserved")).isEqualTo(false);
        assertThat(jdbc.queryForObject("SELECT street FROM shipments WHERE order_id = ?", String.class, orderId))
                .isEqualTo("Corrientes");
    }

    @Test
    void withEnoughStockInOneBranchShippingReservesThereFollowingThePriority() {
        Long variant = variant("Remera Envio", Map.of(centro, 1, norte, 4));
        Buyer buyer = buyer("Dario", "1155550004");
        Long address = address(buyer, "Florida", "100", "1005");

        JsonNode order = ok(checkout(buyer, shipping(address, cart(variant, 2))));

        assertThat(order.get("fulfillment").asString()).isEqualTo("SINGLE_BRANCH");
        assertThat(stock(variant, norte)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT branch_id FROM orders WHERE id = ?", Long.class, order.get("orderId").asLong()))
                .isEqualTo(norte);
    }

    @Test
    void aChangedTotalOrAnUnavailableLineReturnsTheCurrentQuote() {
        Long variant = variant("Remera Cara", Map.of(centro, 5));
        Buyer buyer = buyer("Eva", "1155550005");
        Map<String, Object> request = new HashMap<>(pickup(centro, cart(variant, 1)));
        request.put("expectedTotal", 900);

        Response changed = checkout(buyer, request);
        assertThat(changed.hasCode("CART_CHANGED")).isTrue();
        assertThat(new BigDecimal(json.readTree(changed.body()).get("quote").get("total").asString())).isEqualByComparingTo("1000");

        Response tooMany = checkout(buyer, pickup(centro, cart(variant, 6)));
        assertThat(tooMany.hasCode("CART_UNAVAILABLE")).isTrue();
        assertThat(json.readTree(tooMany.body()).get("quote").get("items").get(0).get("status").asString())
                .isEqualTo("INSUFFICIENT_STOCK");
        assertThat(stock(variant, centro)).isEqualTo(5);
    }

    @Test
    void buyingRequiresNameAndPhoneAndShippingACompleteAddress() {
        Long variant = variant("Remera Datos", Map.of(centro, 5));

        assertThat(checkout(buyer("Fede", null), pickup(centro, cart(variant, 1))).hasCode("PROFILE_INCOMPLETE")).isTrue();

        Buyer buyer = buyer("Gabi", "1155550007");
        Long withoutPostalCode = address(buyer, "Mitre", "50", null);
        assertThat(checkout(buyer, shipping(withoutPostalCode, cart(variant, 1))).hasCode("ADDRESS_INCOMPLETE")).isTrue();

        Map<String, Object> mixed = new HashMap<>(pickup(centro, cart(variant, 1)));
        mixed.put("addressId", withoutPostalCode);
        assertThat(checkout(buyer, mixed).hasCode("INVALID_DELIVERY")).isTrue();
        assertThat(stock(variant, centro)).isEqualTo(5);
    }

    @Test
    void aBuyerCanHaveAtMostThreeOrdersWaitingForPayment() {
        Long variant = variant("Remera Acaparada", Map.of(centro, 10));
        Buyer buyer = buyer("Hilda", "1155550008");

        for (int i = 0; i < 3; i++) {
            ok(checkout(buyer, pickup(centro, cart(variant, 1))));
        }

        assertThat(checkout(buyer, pickup(centro, cart(variant, 1))).hasCode("TOO_MANY_PENDING_ORDERS")).isTrue();
        assertThat(stock(variant, centro)).isEqualTo(7);
    }

    @Test
    void anotherBuyersAddressAnotherStoresProductOrNoTokenCannotBeUsed() {
        Long variant = variant("Remera Ajena", Map.of(centro, 5));
        Buyer owner = buyer("Ines", "1155550009");
        Buyer other = buyer("Juan", "1155550010");
        Long ownersAddress = address(owner, "Lavalle", "300", "1047");

        assertThat(checkout(other, shipping(ownersAddress, cart(variant, 1))).status()).isEqualTo(404);
        assertThat(checkout(other, pickup(centro, cart(foreignVariant, 1))).hasCode("CART_UNAVAILABLE")).isTrue();
        assertThat(call(null, "POST", "/store/me/checkout", pickup(centro, cart(variant, 1)), STORE_A).status()).isEqualTo(401);
        // El token de la tienda A no sirve en la B.
        assertThat(call(owner.token(), "POST", "/store/me/checkout", pickup(centro, cart(variant, 1)), STORE_B).status())
                .isEqualTo(401);
        assertThat(stock(variant, centro)).isEqualTo(5);
    }

    private record Buyer(String token, Long customerId) {}

    /** Ficha creada desde el ERP y cuenta verificada insertada a mano, con su token. */
    private Buyer buyer(String firstName, String phone) {
        Map<String, Object> customer = new HashMap<>(Map.of("firstName", firstName));
        if (phone != null) {
            customer.put("phone", phone);
        }
        Long customerId = id(call(adminA, "POST", "/customers", customer, null));
        Long accountId = jdbc.queryForObject("SELECT nextval('store_accounts_seq')", Long.class);
        jdbc.update("""
                INSERT INTO store_accounts (id, company_id, customer_id, email, password_hash, email_verified_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'sin-uso', now(), now(), now())
                """, accountId, companyA, customerId, UUID.randomUUID() + "@mail.test");
        return new Buyer(tokenService.generate(accountRepository.findById(accountId).orElseThrow()), customerId);
    }

    private Long address(Buyer buyer, String street, String number, String postalCode) {
        Map<String, Object> address = new HashMap<>(Map.of("street", street, "number", number, "city", "CABA",
                "state", "Buenos Aires", "mainAddress", true));
        if (postalCode != null) {
            address.put("postalCode", postalCode);
        }
        return id(call(buyer.token(), "POST", "/store/me/addresses", address, STORE_A));
    }

    private Long variant(String name, Map<Long, Integer> stockByBranch) {
        return publishedVariant(adminA, companyA, category, name, stockByBranch);
    }

    private Long publishedVariant(String admin, Long companyId, Long categoryId, String name, Map<Long, Integer> stockByBranch) {
        List<Map<String, Object>> initialStock = stockByBranch.entrySet().stream()
                .map(entry -> Map.<String, Object>of("branchId", entry.getKey(), "quantity", entry.getValue()))
                .toList();
        Long product = id(call(admin, "POST", "/products", Map.of("name", name, "categoryId", categoryId,
                "variants", List.of(Map.of("price", 1000, "initialStock", initialStock))), null));
        jdbc.update("""
                INSERT INTO product_images (id, company_id, product_id, storage_key, sort_order, created_at, updated_at)
                VALUES (nextval('product_images_seq'), ?, ?, ?, 0, now(), now())
                """, companyId, product, "companies/" + companyId + "/products/" + product + "/foto.png");
        ok(call(admin, "PATCH", "/products/" + product + "/publication", Map.of("publishedOnline", true), null));
        return jdbc.queryForObject("SELECT MIN(id) FROM product_variants WHERE product_id = ?", Long.class, product);
    }

    private static Map<String, Object> cart(Long variant, int quantity) {
        return Map.of("items", List.of(Map.of("productVariantId", variant, "quantity", quantity)));
    }

    /** El total esperado es el de la cotización: precio 1000 sin ajuste web. */
    private static Map<String, Object> pickup(Long branchId, Map<String, Object> cart) {
        return Map.of("cart", cart, "deliveryType", "LOCAL_PICKUP", "pickupBranchId", branchId,
                "expectedTotal", expectedTotal(cart), "checkoutKey", UUID.randomUUID().toString());
    }

    private static Map<String, Object> shipping(Long addressId, Map<String, Object> cart) {
        return Map.of("cart", cart, "deliveryType", "SHIPPING", "addressId", addressId,
                "expectedTotal", expectedTotal(cart), "checkoutKey", UUID.randomUUID().toString());
    }

    @SuppressWarnings("unchecked")
    private static int expectedTotal(Map<String, Object> cart) {
        return ((List<Map<String, Object>>) cart.get("items")).stream()
                .mapToInt(item -> 1000 * (Integer) item.get("quantity"))
                .sum();
    }

    private Response checkout(Buyer buyer, Map<String, Object> request) {
        return call(buyer.token(), "POST", "/store/me/checkout", request, STORE_A);
    }

    private int stock(Long variant, Long branch) {
        return jdbc.queryForObject("SELECT quantity FROM stocks WHERE product_variant_id = ? AND branch_id = ?",
                Integer.class, variant, branch);
    }

    private String provision(String platform, String companyName, String admin, String domain) {
        JsonNode created = ok(call(platform, "POST", "/provisioning/companies", Map.of(
                "companyName", companyName, "adminUsername", admin, "adminEmail", admin + "@x.com"), null));
        ok(call(platform, "PATCH", "/provisioning/companies/" + created.get("companyId").asLong() + "/store",
                Map.of("storeDomain", domain, "storeEnabled", true), null));
        return login(admin, created.get("temporaryPassword").asString());
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
