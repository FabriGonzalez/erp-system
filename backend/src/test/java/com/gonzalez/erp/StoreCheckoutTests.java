package com.gonzalez.erp;

import com.gonzalez.erp.common.crypto.AesGcmTokenCipher;
import com.gonzalez.erp.common.util.BusinessDate;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoCheckoutClient;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoCheckoutClient.Payment;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoCheckoutClient.Preference;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoCheckoutClient.PreferenceRequest;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import com.gonzalez.erp.modules.mercadopago.service.MercadoPagoOrderReference;
import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.security.StoreTokenService;
import com.gonzalez.erp.modules.store.service.StoreReservationExpiryService;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.mockito.Mockito;
import org.mockito.invocation.Invocation;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import java.util.ArrayList;
import java.util.Properties;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;
import java.util.TimeZone;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/*
 * Checkout de la tienda contra Postgres real: reserva de stock en la sucursal que corresponde, sin
 * cargo en la cuenta, doble clic con la misma clave, envío desde varias sucursales, carrito
 * cambiado, datos del comprador, tope de compras sin pagar y aislamiento entre compradores y
 * tiendas. Cada test usa su propio producto y comprador: comparten la tienda.
 * Las cuentas de comprador se insertan directo en la base (el registro se prueba en StoreAccountTests).
 * La tienda A tiene Mercado Pago conectado (insertado en la base); el cobro está simulado y
 * devuelve un link con el id del pedido. En el webhook, la consulta y la devolución de pagos
 * también están simuladas; la firma de los avisos es real.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin",
        "app.encryption.key=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        "app.mercadopago.client-id=123456",
        "app.mercadopago.client-secret=secreto-de-la-app",
        "app.mercadopago.redirect-uri=https://api.erp.test/api/v1/mercadopago/oauth/callback",
        "app.mercadopago.renewal-cron=-",
        "app.store.expiry-cron=-",
        "app.mercadopago.webhook-secret=" + StoreCheckoutTests.WEBHOOK_SECRET
})
@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StoreCheckoutTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

    static final String WEBHOOK_SECRET = "clave-del-webhook";
    private static final long MP_USER_A = 7001;
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

    @Autowired
    private AesGcmTokenCipher tokenCipher;

    @MockitoBean
    private MercadoPagoCheckoutClient checkoutClient;

    @MockitoBean
    private JavaMailSender mailSender;

    @Autowired
    private StoreReservationExpiryService expiryService;

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

        jdbc.update("""
                INSERT INTO mercado_pago_connections (id, company_id, mp_user_id, access_token_encrypted,
                    refresh_token_encrypted, live_mode, expires_at, connected_at, status, created_at, updated_at)
                VALUES (nextval('mercado_pago_connections_seq'), ?, ?, ?, ?, true, now() + interval '90 days',
                    now(), 'CONNECTED', now(), now())
                """, companyA, MP_USER_A, tokenCipher.encrypt("APP_USR-token-a"), tokenCipher.encrypt("TG-refresh-a"));
    }

    // Los mocks se reinician después de cada test: el cobro simulado se arma de nuevo en cada uno.
    @BeforeEach
    void simulateMercadoPago() {
        // doAnswer y no when(...): when llama al mock y, si ya tenía esta respuesta, la corre con argumentos nulos.
        doAnswer(invocation -> {
            String orderId = MercadoPagoOrderReference.parse(invocation.<PreferenceRequest>getArgument(1).externalReference())
                    .orElseThrow().toString();
            return new Preference("pref-" + orderId, paymentUrl(orderId), "https://sandbox.mp.test/pay/" + orderId);
        }).when(checkoutClient).createPreference(anyString(), any());
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
        assertThat(order.get("paymentUrl").asString()).isEqualTo(paymentUrl(order.get("orderId").asString()));
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

    // --- Mis pedidos ---

    @Test
    void myOrdersListOnlyTheBuyersWebOrdersNewestFirst() {
        Long variant = variant("Remera Historial", Map.of(centro, 10));
        Buyer buyer = buyer("Karina", "1155550011");
        Buyer other = buyer("Lucas", "1155550012");
        Long older = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        Long newer = ok(checkout(buyer, pickup(centro, cart(variant, 3)))).get("orderId").asLong();
        // Una venta del local cargada a la misma ficha no es un pedido de la tienda.
        Long localSale = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        jdbc.update("UPDATE orders SET channel = 'ERP' WHERE id = ?", localSale);
        Long othersOrder = ok(checkout(other, pickup(centro, cart(variant, 1)))).get("orderId").asLong();

        JsonNode page = ok(call(buyer.token(), "GET", "/store/me/orders", null, STORE_A));

        assertThat(page.get("totalElements").asLong()).isEqualTo(2);
        JsonNode first = page.get("content").get(0);
        assertThat(first.get("id").asLong()).isEqualTo(newer);
        assertThat(page.get("content").get(1).get("id").asLong()).isEqualTo(older);
        assertThat(first.get("status").asString()).isEqualTo("AWAITING_PAYMENT");
        assertThat(first.get("units").asInt()).isEqualTo(3);
        assertThat(new BigDecimal(first.get("total").asString())).isEqualByComparingTo("3000");
        assertThat(first.get("coverImageUrl").asString()).endsWith("/foto.png");

        assertThat(myOrder(buyer, localSale).status()).isEqualTo(404);
        assertThat(myOrder(buyer, othersOrder).status()).isEqualTo(404);
        assertThat(call(buyer.token(), "POST", "/store/me/orders/" + othersOrder + "/cancel", null, STORE_A).status())
                .isEqualTo(404);
        assertThat(call(null, "GET", "/store/me/orders", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(buyer.token(), "GET", "/store/me/orders", null, STORE_B).status()).isEqualTo(401);
        assertThat(call(buyer.token(), "GET", "/store/me/orders?size=0", null, STORE_A).status()).isEqualTo(400);
    }

    @Test
    void theDetailShowsWhatWasBoughtAtTheChargedPricesAndWhereItGoes() {
        Long variant = variant("Remera Detalle", Map.of(centro, 10));
        Long product = jdbc.queryForObject("SELECT product_id FROM product_variants WHERE id = ?", Long.class, variant);
        LocalDate today = BusinessDate.today();
        Long promotion = id(call(adminA, "POST", "/promotions", Map.of("name", "Dos Remeras", "price", 1500,
                "startDate", today.minusDays(1).toString(), "endDate", today.plusDays(5).toString(),
                "items", List.of(Map.of("productId", product, "quantity", 2))), null));
        Buyer buyer = buyer("Marta", "1155550013");
        Long address = address(buyer, "Sarmiento", "800", "1041");

        Map<String, Object> cart = Map.of(
                "items", List.of(Map.of("productVariantId", variant, "quantity", 1)),
                "promos", List.of(Map.of("promotionId", promotion, "quantity", 1,
                        "variants", List.of(Map.of("productVariantId", variant, "quantity", 2)))));
        Long orderId = ok(checkout(buyer, Map.of("cart", cart, "deliveryType", "SHIPPING", "addressId", address,
                "expectedTotal", 2500, "checkoutKey", UUID.randomUUID().toString()))).get("orderId").asLong();
        // Cambiar el precio después no altera el pedido.
        jdbc.update("UPDATE product_variants SET price = 5000 WHERE id = ?", variant);

        JsonNode order = ok(myOrder(buyer, orderId));

        assertThat(order.get("status").asString()).isEqualTo("AWAITING_PAYMENT");
        assertThat(order.get("cancellable").asBoolean()).isTrue();
        assertThat(order.get("deliveryType").asString()).isEqualTo("SHIPPING");
        assertThat(order.get("pickupBranch").isNull()).isTrue();
        assertThat(order.get("shippingAddress").get("street").asString()).isEqualTo("Sarmiento");
        assertThat(order.get("shippingAddress").get("postalCode").asString()).isEqualTo("1041");
        JsonNode item = order.get("items").get(0);
        assertThat(item.get("productName").asString()).isEqualTo("Remera Detalle");
        assertThat(item.get("quantity").asInt()).isEqualTo(1);
        assertThat(new BigDecimal(item.get("unitPrice").asString())).isEqualByComparingTo("1000");
        assertThat(item.get("imageUrl").asString()).endsWith("/foto.png");
        assertThat(item.has("sku")).isFalse();
        JsonNode promo = order.get("promos").get(0);
        assertThat(promo.get("name").asString()).isEqualTo("Dos Remeras");
        assertThat(new BigDecimal(promo.get("lineTotal").asString())).isEqualByComparingTo("1500");
        assertThat(promo.get("components").get(0).get("quantity").asInt()).isEqualTo(2);
        assertThat(new BigDecimal(order.get("total").asString())).isEqualByComparingTo("2500");
        assertThat(ok(call(buyer.token(), "GET", "/store/me/orders", null, STORE_A))
                .get("content").get(0).get("units").asInt()).isEqualTo(3);
    }

    @Test
    void anUnpaidOrderCanBeCancelledOnceAndGivesTheStockBack() {
        Long variant = variant("Remera Arrepentida", Map.of(centro, 5));
        Buyer buyer = buyer("Nora", "1155550014");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 2)))).get("orderId").asLong();
        assertThat(stock(variant, centro)).isEqualTo(3);

        JsonNode cancelled = ok(call(buyer.token(), "POST", "/store/me/orders/" + orderId + "/cancel", null, STORE_A));

        assertThat(cancelled.get("status").asString()).isEqualTo("CANCELLED");
        assertThat(cancelled.get("cancellable").asBoolean()).isFalse();
        assertThat(stock(variant, centro)).isEqualTo(5);
        assertThat(call(buyer.token(), "POST", "/store/me/orders/" + orderId + "/cancel", null, STORE_A)
                .hasCode("ORDER_NOT_CANCELLABLE")).isTrue();
        // Sigue en el listado, como cancelado.
        assertThat(ok(call(buyer.token(), "GET", "/store/me/orders", null, STORE_A))
                .get("content").get(0).get("status").asString()).isEqualTo("CANCELLED");

        // Uno pagado (acá, simulado en la base) no se cancela desde la tienda.
        Long paid = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        jdbc.update("UPDATE orders SET status = 'CONFIRMED' WHERE id = ?", paid);
        assertThat(call(buyer.token(), "POST", "/store/me/orders/" + paid + "/cancel", null, STORE_A)
                .hasCode("ORDER_NOT_CANCELLABLE")).isTrue();
        assertThat(ok(myOrder(buyer, paid)).get("status").asString()).isEqualTo("READY_FOR_PICKUP");
        assertThat(stock(variant, centro)).isEqualTo(4);

        // Sin reserva (sale de varias sucursales) se cancela sin tocar el stock.
        Long spread = variant("Remera Repartida Cancelada", Map.of(centro, 1, norte, 1));
        Long address = address(buyer, "Tucuman", "10", "1049");
        Long unreserved = ok(checkout(buyer, shipping(address, cart(spread, 2)))).get("orderId").asLong();
        ok(call(buyer.token(), "POST", "/store/me/orders/" + unreserved + "/cancel", null, STORE_A));
        assertThat(stock(spread, centro)).isEqualTo(1);
        assertThat(stock(spread, norte)).isEqualTo(1);
    }

    // --- Cobro con Mercado Pago ---

    @Test
    void theCheckoutCreatesTheChargeWithTheStoresAccountAndItExpiresWithTheReservation() {
        Long variant = variant("Remera Cobro", Map.of(centro, 5));
        Buyer buyer = buyer("Olga", "1155550015");
        Instant before = Instant.now();

        JsonNode order = ok(checkout(buyer, pickup(centro, cart(variant, 2))));

        Long orderId = order.get("orderId").asLong();
        ArgumentCaptor<PreferenceRequest> sent = ArgumentCaptor.forClass(PreferenceRequest.class);
        verify(checkoutClient).createPreference(eq("APP_USR-token-a"), sent.capture());
        PreferenceRequest request = sent.getValue();
        assertThat(request.externalReference()).isEqualTo("erp-order-" + orderId);
        assertThat(request.amount()).isEqualByComparingTo("2000");
        assertThat(request.title()).startsWith("Pedido ").endsWith(" - Checkout A");
        assertThat(request.payerEmail()).isEqualTo(buyer.email());
        assertThat(request.backUrl()).isEqualTo("https://" + STORE_A + "/pedidos/" + orderId);
        assertThat(request.expiresAt()).isBetween(before.plus(Duration.ofMinutes(30)), Instant.now().plus(Duration.ofMinutes(30)));
        assertThat(Instant.parse(order.get("paymentExpiresAt").asString())).isEqualTo(request.expiresAt());

        Map<String, Object> saved = jdbc.queryForMap("SELECT mp_preference_id, payment_url FROM orders WHERE id = ?", orderId);
        assertThat(saved.get("mp_preference_id")).isEqualTo("pref-" + orderId);
        assertThat(saved.get("payment_url")).isEqualTo(paymentUrl(orderId.toString()));
    }

    @Test
    void theLinkIsResumedFromMyOrdersOrTheSameKeyUntilTheReservationExpires() {
        Long variant = variant("Remera Retomada", Map.of(centro, 5));
        Buyer buyer = buyer("Pablo", "1155550016");
        Map<String, Object> request = pickup(centro, cart(variant, 1));
        Long orderId = ok(checkout(buyer, request)).get("orderId").asLong();
        String link = paymentUrl(orderId.toString());

        assertThat(ok(myOrder(buyer, orderId)).get("paymentUrl").asString()).isEqualTo(link);
        // El reintento devuelve el mismo link sin armar otro cobro.
        assertThat(ok(checkout(buyer, request)).get("paymentUrl").asString()).isEqualTo(link);
        verify(checkoutClient, times(1)).createPreference(anyString(), any());

        jdbc.update("UPDATE orders SET payment_expires_at = now() - interval '1 minute' WHERE id = ?", orderId);
        assertThat(ok(myOrder(buyer, orderId)).get("paymentUrl").isNull()).isTrue();

        jdbc.update("UPDATE orders SET payment_expires_at = now() + interval '10 minutes' WHERE id = ?", orderId);
        ok(call(buyer.token(), "POST", "/store/me/orders/" + orderId + "/cancel", null, STORE_A));
        assertThat(ok(myOrder(buyer, orderId)).get("paymentUrl").isNull()).isTrue();
    }

    @Test
    void withoutAUsableMercadoPagoAccountNothingIsReserved() {
        Long variant = variant("Remera Sin Cobro", Map.of(centro, 5));
        Buyer buyer = buyer("Quique", "1155550017");
        try {
            jdbc.update("UPDATE mercado_pago_connections SET status = 'RECONNECT_REQUIRED' WHERE company_id = ?", companyA);
            assertThat(checkout(buyer, pickup(centro, cart(variant, 1))).hasCode("PAYMENT_UNAVAILABLE")).isTrue();

            jdbc.update("""
                    UPDATE mercado_pago_connections SET status = 'CONNECTED', expires_at = now() - interval '1 minute'
                    WHERE company_id = ?
                    """, companyA);
            assertThat(checkout(buyer, pickup(centro, cart(variant, 1))).hasCode("PAYMENT_UNAVAILABLE")).isTrue();
        } finally {
            jdbc.update("""
                    UPDATE mercado_pago_connections SET status = 'CONNECTED', expires_at = now() + interval '90 days'
                    WHERE company_id = ?
                    """, companyA);
        }
        assertThat(stock(variant, centro)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(0);
    }

    @Test
    void ifMercadoPagoFailsTheOrderAndTheReservationAreUndoneAndTheSameKeyCanRetry() {
        Long variant = variant("Remera Reintento", Map.of(centro, 5));
        Buyer buyer = buyer("Rosa", "1155550018");
        Map<String, Object> request = pickup(centro, cart(variant, 2));
        doThrow(MercadoPagoException.unavailable()).when(checkoutClient).createPreference(anyString(), any());

        Response failed = checkout(buyer, request);

        assertThat(failed.status()).isEqualTo(502);
        assertThat(failed.body()).contains("MERCADOPAGO_UNAVAILABLE");
        assertThat(stock(variant, centro)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(0);

        simulateMercadoPago();
        JsonNode order = ok(checkout(buyer, request));
        assertThat(order.get("paymentUrl").asString()).isEqualTo(paymentUrl(order.get("orderId").asString()));
        assertThat(stock(variant, centro)).isEqualTo(3);
    }

    // --- Webhook de Mercado Pago ---

    @Test
    void anApprovedPaymentConfirmsThePickupAndLeavesTheAccountSquared() {
        Long variant = variant("Remera Pagada", Map.of(centro, 5));
        Buyer buyer = buyer("Sergio", "1155550019");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 2)))).get("orderId").asLong();
        approved("mp-1001", orderId, "2000");

        assertThat(webhook("mp-1001").status()).isEqualTo(200);

        Map<String, Object> order = jdbc.queryForMap("SELECT status, confirmed_at FROM orders WHERE id = ?", orderId);
        assertThat(order.get("status")).isEqualTo("CONFIRMED");
        assertThat(order.get("confirmed_at")).isNotNull();
        Map<String, Object> payment = jdbc.queryForMap(
                "SELECT amount, method, created_by, mp_payment_id FROM payments WHERE customer_id = ?", buyer.customerId());
        assertThat((BigDecimal) payment.get("amount")).isEqualByComparingTo("2000");
        assertThat(payment.get("method")).isEqualTo("MERCADO_PAGO");
        assertThat(payment.get("created_by")).isNull();
        assertThat(payment.get("mp_payment_id")).isEqualTo("mp-1001");
        assertThat(jdbc.queryForObject("SELECT amount FROM payment_allocations WHERE order_id = ?", BigDecimal.class, orderId))
                .isEqualByComparingTo("2000");
        // Cargo y pago juntos: no queda deuda.
        assertThat(balance(buyer)).isEqualByComparingTo("0");
        assertThat(jdbc.queryForObject("""
                SELECT COUNT(*) FROM account_transactions t JOIN customer_accounts a ON a.id = t.account_id
                WHERE a.customer_id = ?
                """, Long.class, buyer.customerId())).isEqualTo(2);
        assertThat(stock(variant, centro)).isEqualTo(3);
        assertThat(ok(myOrder(buyer, orderId)).get("status").asString()).isEqualTo("READY_FOR_PICKUP");

        // Mercado Pago repite los avisos: el segundo no cambia nada.
        assertThat(webhook("mp-1001").status()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(1);
        assertThat(balance(buyer)).isEqualByComparingTo("0");
        verify(checkoutClient, never()).refundPayment(anyString(), anyString());
    }

    @Test
    void aPaidShipmentGoesToPrepareAndOneWithoutReservationToAssign() {
        Long variant = variant("Remera Enviada", Map.of(centro, 5));
        Long spread = variant("Remera Repartida Pagada", Map.of(centro, 1, norte, 1));
        Buyer buyer = buyer("Tania", "1155550020");
        Long address = address(buyer, "Belgrano", "20", "1092");
        Long shipped = ok(checkout(buyer, shipping(address, cart(variant, 1)))).get("orderId").asLong();
        Long unreserved = ok(checkout(buyer, shipping(address, cart(spread, 2)))).get("orderId").asLong();
        approved("mp-2001", shipped, "1000");
        approved("mp-2002", unreserved, "2000");

        ok(webhook("mp-2001"));
        ok(webhook("mp-2002"));

        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, shipped)).isEqualTo("TO_PREPARE");
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, unreserved)).isEqualTo("TO_ASSIGN");
        assertThat(ok(myOrder(buyer, unreserved)).get("status").asString()).isEqualTo("PREPARING");
        assertThat(stock(spread, centro)).isEqualTo(1);
        assertThat(balance(buyer)).isEqualByComparingTo("0");
    }

    @Test
    void withoutAValidSignatureNothingIsLookedUp() {
        Long variant = variant("Remera Falsa", Map.of(centro, 5));
        Buyer buyer = buyer("Ulises", "1155550021");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        approved("mp-3001", orderId, "1000");

        assertThat(webhook("mp-3001", "ts=1700000000,v1=" + "0".repeat(64), MP_USER_A).status()).isEqualTo(401);
        assertThat(webhook("mp-3001", null, MP_USER_A).status()).isEqualTo(401);
        // Firmado para otro pago: no sirve para este.
        assertThat(webhook("mp-3001", signature("mp-9999", "req-1", "1700000000"), MP_USER_A).status()).isEqualTo(401);
        // Otros eventos se reciben y se ignoran.
        assertThat(rawWebhook("/mercadopago/webhook?data.id=mp-3001&type=merchant_order", null, null, "{}").status())
                .isEqualTo(200);

        verify(checkoutClient, never()).findPayment(anyString(), anyString());
        verify(checkoutClient, never()).refundPayment(anyString(), anyString());
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId))
                .isEqualTo("PENDING_PAYMENT");
    }

    @Test
    void rejectedForeignOrMismatchedPaymentsDoNotChangeTheOrder() {
        Long variant = variant("Remera Rechazada", Map.of(centro, 5));
        Buyer buyer = buyer("Valeria", "1155550022");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();

        // Rechazado: el comprador puede reintentar con otra tarjeta.
        doReturn(Optional.of(new Payment("mp-4001", "rejected", "erp-order-" + orderId, new BigDecimal("1000"), "ARS")))
                .when(checkoutClient).findPayment("APP_USR-token-a", "mp-4001");
        ok(webhook("mp-4001"));
        // Aprobado por menos de lo que vale el pedido.
        approved("mp-4002", orderId, "10");
        ok(webhook("mp-4002"));
        // Una cuenta de Mercado Pago que no es de ninguna empresa.
        ok(webhook("mp-4003", signature("mp-4003", "req-mp-4003", "1700000000"), 99999L));
        // Un pago que Mercado Pago no conoce para esta cuenta.
        doReturn(Optional.empty()).when(checkoutClient).findPayment("APP_USR-token-a", "mp-4004");
        ok(webhook("mp-4004"));

        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId))
                .isEqualTo("PENDING_PAYMENT");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(0);
        verify(checkoutClient, never()).refundPayment(anyString(), anyString());
    }

    @Test
    void cancellingExpiresTheLinkAndAPaymentThatStillArrivesIsRefunded() {
        Long variant = variant("Remera Devuelta", Map.of(centro, 5));
        Buyer buyer = buyer("Walter", "1155550023");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();

        ok(call(buyer.token(), "POST", "/store/me/orders/" + orderId + "/cancel", null, STORE_A));
        verify(checkoutClient).expirePreference("APP_USR-token-a", "pref-" + orderId);

        approved("mp-5001", orderId, "1000");
        ok(webhook("mp-5001"));

        verify(checkoutClient).refundPayment("APP_USR-token-a", "mp-5001");
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId)).isEqualTo("CANCELLED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(0);
        assertThat(stock(variant, centro)).isEqualTo(5);
    }

    @Test
    void aSecondPaymentForAnAlreadyPaidOrderIsRefunded() {
        Long variant = variant("Remera Doble Pago", Map.of(centro, 5));
        Buyer buyer = buyer("Ximena", "1155550024");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        approved("mp-6001", orderId, "1000");
        approved("mp-6002", orderId, "1000");

        ok(webhook("mp-6001"));
        ok(webhook("mp-6002"));

        verify(checkoutClient).refundPayment("APP_USR-token-a", "mp-6002");
        verify(checkoutClient, never()).refundPayment("APP_USR-token-a", "mp-6001");
        assertThat(jdbc.queryForObject("SELECT mp_payment_id FROM payments WHERE customer_id = ?", String.class,
                buyer.customerId())).isEqualTo("mp-6001");
    }

    @Test
    void ifMercadoPagoDoesNotAnswerTheNotificationIsRetried() {
        Long variant = variant("Remera Reintentada", Map.of(centro, 5));
        Buyer buyer = buyer("Yanina", "1155550025");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        doThrow(MercadoPagoException.unavailable()).when(checkoutClient).findPayment("APP_USR-token-a", "mp-7001");

        assertThat(webhook("mp-7001").status()).isEqualTo(502);
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId))
                .isEqualTo("PENDING_PAYMENT");

        approved("mp-7001", orderId, "1000");
        ok(webhook("mp-7001"));
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId)).isEqualTo("CONFIRMED");
    }

    @Test
    void aSaleOfTheSameAccountWithAPlainNumberAsReferenceIsNeitherCreditedNorRefunded() {
        Long variant = variant("Remera Ajena Al Sistema", Map.of(centro, 5));
        Buyer buyer = buyer("Zoe", "1155550026");
        Long pending = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        Long cancelled = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        ok(call(buyer.token(), "POST", "/store/me/orders/" + cancelled + "/cancel", null, STORE_A));
        // Otro sistema del local cobra con la misma cuenta y usa números como referencia.
        approvedWithReference("mp-8001", pending.toString(), "1000");
        approvedWithReference("mp-8002", cancelled.toString(), "1000");
        approvedWithReference("mp-8003", "erp-order-" + cancelled + "-x", "1000");

        ok(webhook("mp-8001"));
        ok(webhook("mp-8002"));
        ok(webhook("mp-8003"));

        verify(checkoutClient, never()).refundPayment(anyString(), anyString());
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, pending))
                .isEqualTo("PENDING_PAYMENT");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(0);
    }

    @Test
    void aRejectedRefundIsNotRetriedButAnUnansweredOneIs() {
        Long variant = variant("Remera Sin Saldo", Map.of(centro, 5));
        Buyer buyer = buyer("Abril", "1155550027");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        ok(call(buyer.token(), "POST", "/store/me/orders/" + orderId + "/cancel", null, STORE_A));
        approved("mp-9001", orderId, "1000");
        approved("mp-9002", orderId, "1000");

        // Rechazada (sin saldo, pago viejo): reintentar no sirve, queda el error para devolverla a mano.
        doThrow(MercadoPagoException.rejected()).when(checkoutClient).refundPayment("APP_USR-token-a", "mp-9001");
        assertThat(webhook("mp-9001").status()).isEqualTo(200);

        // Mercado Pago no respondió: el aviso vuelve a llegar y se intenta otra vez.
        doThrow(MercadoPagoException.unavailable()).when(checkoutClient).refundPayment("APP_USR-token-a", "mp-9002");
        assertThat(webhook("mp-9002").status()).isEqualTo(502);

        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, orderId)).isEqualTo("CANCELLED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM payments WHERE customer_id = ?", Long.class, buyer.customerId()))
                .isEqualTo(0);
    }

    // --- Mails de pedido y vencimiento de reservas ---

    @Test
    void anApprovedPaymentMailsTheConfirmationOnceWithWhatWasBought() {
        Long variant = variant("Remera Confirmada", Map.of(centro, 5));
        Buyer buyer = buyer("Bruno", "1155550028");
        Long orderId = ok(checkout(buyer, pickup(centro, cart(variant, 2)))).get("orderId").asLong();
        approved("mp-10001", orderId, "2000");

        ok(webhook("mp-10001"));
        ok(webhook("mp-10001"));

        Mail mail = awaitMail(buyer.email(), "Recibimos tu pago");
        assertThat(mail.subject()).contains(orderNumber(orderId), "Checkout A");
        assertThat(mail.body()).contains("Hola Bruno", "2 x Remera Confirmada", "$ 2.000", "sucursal Centro",
                "/pedidos/" + orderId);
        // El aviso repetido no manda otro mail.
        pause();
        assertThat(mailsTo(buyer.email())).hasSize(1);
    }

    @Test
    void theConfirmationOfAShipmentFromSeveralBranchesSaysWhereItGoesAndThatItMayTakeLonger() {
        Long spread = variant("Remera Repartida Avisada", Map.of(centro, 1, norte, 1));
        Buyer buyer = buyer("Camila", "1155550029");
        Long address = address(buyer, "Belgrano", "20", "1092");
        Long orderId = ok(checkout(buyer, shipping(address, cart(spread, 2)))).get("orderId").asLong();
        approved("mp-10002", orderId, "2000");

        ok(webhook("mp-10002"));

        Mail mail = awaitMail(buyer.email(), "Recibimos tu pago");
        assertThat(mail.body()).contains("Belgrano 20, CABA, Buenos Aires (CP 1092)", "distintas sucursales");
    }

    @Test
    void anUnpaidReservationExpiresAfterTheMarginGivesTheStockBackAndTellsTheBuyer() {
        Long variant = variant("Remera Vencida", Map.of(centro, 5));
        Buyer buyer = buyer("Dario", "1155550030");
        Long paid = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        approved("mp-10003", paid, "1000");
        ok(webhook("mp-10003"));
        Long expired = ok(checkout(buyer, pickup(centro, cart(variant, 2)))).get("orderId").asLong();
        Long withinMargin = ok(checkout(buyer, pickup(centro, cart(variant, 1)))).get("orderId").asLong();
        assertThat(stock(variant, centro)).isEqualTo(1);

        jdbc.update("UPDATE orders SET payment_expires_at = now() - interval '11 minutes' WHERE id = ?", expired);
        jdbc.update("UPDATE orders SET payment_expires_at = now() - interval '5 minutes' WHERE id = ?", withinMargin);
        jdbc.update("UPDATE orders SET payment_expires_at = now() - interval '1 hour' WHERE id = ?", paid);

        assertThat(expiryService.expireOverdueOrders()).isGreaterThanOrEqualTo(1);

        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, expired)).isEqualTo("CANCELLED");
        assertThat(jdbc.queryForObject("SELECT cancelled_at FROM orders WHERE id = ?", Instant.class, expired)).isNotNull();
        // Dentro del margen todavía puede estar entrando un pago; el pagado no se toca.
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, withinMargin))
                .isEqualTo("PENDING_PAYMENT");
        assertThat(jdbc.queryForObject("SELECT status FROM orders WHERE id = ?", String.class, paid)).isEqualTo("CONFIRMED");
        assertThat(stock(variant, centro)).isEqualTo(3);
        // El link ya venció solo: no hace falta pedirle nada a Mercado Pago.
        verify(checkoutClient, never()).expirePreference(anyString(), eq("pref-" + expired));

        Mail mail = awaitMail(buyer.email(), "Se canceló");
        assertThat(mail.subject()).contains(orderNumber(expired));
        assertThat(mail.body()).contains("Hola Dario", "No se te cobró nada");

        // La segunda pasada no lo cancela de nuevo ni devuelve el stock dos veces.
        expiryService.expireOverdueOrders();
        assertThat(stock(variant, centro)).isEqualTo(3);
        pause();
        assertThat(mailsTo(buyer.email()).stream().filter(m -> m.subject().startsWith("Se canceló"))).hasSize(1);
    }

    private String orderNumber(Long orderId) {
        return jdbc.queryForObject("SELECT order_number FROM orders WHERE id = ?", String.class, orderId);
    }

    private record Mail(String subject, String body) {}

    /** Espera el primer mail a ese email cuyo asunto empieza así (sale en otro hilo, después del commit). */
    private Mail awaitMail(String email, String subjectStart) {
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            Optional<Mail> found = mailsTo(email).stream().filter(m -> m.subject().startsWith(subjectStart)).findFirst();
            if (found.isPresent()) {
                return found.get();
            }
            pause(200);
        }
        throw new AssertionError("No mail \"" + subjectStart + "...\" to " + email + ": " + mailsTo(email));
    }

    private List<Mail> mailsTo(String email) {
        List<Mail> mails = new ArrayList<>();
        for (Invocation invocation : List.copyOf(Mockito.mockingDetails(mailSender).getInvocations())) {
            if (invocation.getArguments().length == 1
                    && invocation.getArgument(0) instanceof MimeMessagePreparator preparator) {
                try {
                    MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
                    preparator.prepare(message);
                    if (message.getAllRecipients()[0].toString().equals(email)) {
                        mails.add(new Mail(message.getSubject(), text(message)));
                    }
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }
        }
        return mails;
    }

    // Junta el texto plano y el HTML.
    private static String text(Part part) throws Exception {
        Object content = part.getContent();
        if (content instanceof String text) {
            return text;
        }
        StringBuilder all = new StringBuilder();
        if (content instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                all.append(text(multipart.getBodyPart(i))).append('\n');
            }
        }
        return all.toString();
    }

    // Lo que se espera que no llegue tiene que tener tiempo de llegar si fuera a llegar.
    private static void pause() {
        pause(1_000);
    }

    private static void pause(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void approved(String paymentId, Long orderId, String amount) {
        approvedWithReference(paymentId, "erp-order-" + orderId, amount);
    }

    private void approvedWithReference(String paymentId, String externalReference, String amount) {
        doReturn(Optional.of(new Payment(paymentId, "approved", externalReference, new BigDecimal(amount), "ARS")))
                .when(checkoutClient).findPayment("APP_USR-token-a", paymentId);
    }

    private BigDecimal balance(Buyer buyer) {
        return jdbc.queryForObject("SELECT COALESCE(SUM(balance), 0) FROM customer_accounts WHERE customer_id = ?",
                BigDecimal.class, buyer.customerId());
    }

    /** Aviso de pago de la cuenta de la tienda A, firmado como lo firma Mercado Pago. */
    private Response webhook(String paymentId) {
        String ts = String.valueOf(Instant.now().getEpochSecond());
        return webhook(paymentId, signature(paymentId, "req-" + paymentId, ts), MP_USER_A);
    }

    private Response webhook(String paymentId, String signatureHeader, long mpUserId) {
        String requestId = signatureHeader == null ? null : "req-" + paymentId;
        String body = json.writeValueAsString(Map.of("type", "payment", "action", "payment.updated",
                "user_id", mpUserId, "data", Map.of("id", paymentId)));
        return rawWebhook("/mercadopago/webhook?data.id=" + paymentId + "&type=payment", signatureHeader, requestId, body);
    }

    private static String signature(String dataId, String requestId, String ts) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";
            return "ts=" + ts + ",v1=" + HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private Response rawWebhook(String path, String signatureHeader, String requestId, String body) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (signatureHeader != null) {
            builder.header("x-signature", signatureHeader);
        }
        if (requestId != null) {
            builder.header("x-request-id", requestId);
        }
        try {
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body());
        } catch (Exception e) {
            throw new IllegalStateException("POST " + path, e);
        }
    }

    private static String paymentUrl(String orderId) {
        return "https://mp.test/pay/" + orderId;
    }

    private Response myOrder(Buyer buyer, Long orderId) {
        return call(buyer.token(), "GET", "/store/me/orders/" + orderId, null, STORE_A);
    }

    private record Buyer(String token, Long customerId, String email) {}

    /** Ficha creada desde el ERP y cuenta verificada insertada a mano, con su token. */
    private Buyer buyer(String firstName, String phone) {
        Map<String, Object> customer = new HashMap<>(Map.of("firstName", firstName));
        if (phone != null) {
            customer.put("phone", phone);
        }
        Long customerId = id(call(adminA, "POST", "/customers", customer, null));
        Long accountId = jdbc.queryForObject("SELECT nextval('store_accounts_seq')", Long.class);
        String email = UUID.randomUUID() + "@mail.test";
        jdbc.update("""
                INSERT INTO store_accounts (id, company_id, customer_id, email, password_hash, email_verified_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'sin-uso', now(), now(), now())
                """, accountId, companyA, customerId, email);
        return new Buyer(tokenService.generate(accountRepository.findById(accountId).orElseThrow()), customerId, email);
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
