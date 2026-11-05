package com.gonzalez.erp;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * Cuentas de comprador contra Postgres real: registro sin revelar cuentas existentes, fichas WEB
 * separadas de las del ERP, una cuenta por tienda, y que el token de comprador, el de empleado y
 * el de otra tienda no se mezclen.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin"
})
@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StoreAccountTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

    private static final TimeZone originalTimeZone = TimeZone.getDefault();
    private static final String STORE_A = "cuentas-a.test";
    private static final String STORE_B = "cuentas-b.test";
    private static final String PASSWORD = "clave1234";

    // Mismo motivo que en TenantIsolationTests: con la zona de Windows Postgres rechaza la conexión.
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    @Value("${local.server.port}")
    private int port;

    private String adminA;
    private String adminB;

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @BeforeAll
    void createStores() {
        String platform = ok(call(null, "POST", "/auth/login",
                Map.of("username", "platform_admin", "password", "test-platform-admin"), null)).get("token").asString();
        adminA = provision(platform, "Cuentas A", "admin_cuentas_a", STORE_A);
        adminB = provision(platform, "Cuentas B", "admin_cuentas_b", STORE_B);
    }

    @Test
    void registeringCreatesANewWebCustomerAndTheBuyerCanLogIn() {
        assertThat(register(STORE_A, "Ana", "ana@mail.test", PASSWORD).status()).isEqualTo(202);

        String token = buyerLogin(STORE_A, "ANA@mail.test", PASSWORD);
        JsonNode me = ok(call(token, "GET", "/store/me", null, STORE_A));
        assertThat(me.get("firstName").asString()).isEqualTo("Ana");
        assertThat(me.get("email").asString()).isEqualTo("ana@mail.test");
        assertThat(me.get("emailVerified").asBoolean()).isFalse();
        // Nada de la ficha del ERP.
        assertThat(me.has("observations")).isFalse();
        assertThat(me.has("id")).isFalse();

        assertThat(customerNames(adminA, "WEB")).contains("Ana");
    }

    @Test
    void anErpCustomerWithTheSameEmailIsNeverLinked() {
        ok(call(adminA, "POST", "/customers",
                Map.of("firstName", "Bruno del Local", "email", "bruno@mail.test"), null));

        assertThat(register(STORE_A, "Bruno", "bruno@mail.test", PASSWORD).status()).isEqualTo(202);

        assertThat(customerNames(adminA, "ERP")).contains("Bruno del Local");
        assertThat(customerNames(adminA, "WEB")).contains("Bruno").doesNotContain("Bruno del Local");
        assertThat(ok(call(buyerLogin(STORE_A, "bruno@mail.test", PASSWORD), "GET", "/store/me", null, STORE_A))
                .get("firstName").asString()).isEqualTo("Bruno");
    }

    @Test
    void registeringAnExistingEmailLooksTheSameAndDoesNotChangeTheAccount() {
        assertThat(register(STORE_A, "Carla", "carla@mail.test", PASSWORD).status()).isEqualTo(202);

        Response again = register(STORE_A, "Intrusa", "carla@mail.test", "otra5678");
        assertThat(again.status()).isEqualTo(202);
        assertThat(again.body()).isEmpty();

        // La contraseña original sigue valiendo y la del segundo registro no.
        assertThat(login(STORE_A, "carla@mail.test", "otra5678").hasCode("INVALID_CREDENTIALS")).isTrue();
        assertThat(ok(call(buyerLogin(STORE_A, "carla@mail.test", PASSWORD), "GET", "/store/me", null, STORE_A))
                .get("firstName").asString()).isEqualTo("Carla");
        assertThat(customerNames(adminA, "WEB")).doesNotContain("Intrusa");
    }

    @Test
    void eachStoreHasItsOwnAccounts() {
        register(STORE_A, "Dario", "dario@mail.test", PASSWORD);
        String tokenA = buyerLogin(STORE_A, "dario@mail.test", PASSWORD);

        // En la tienda B no tiene cuenta hasta registrarse ahí, con su propia contraseña.
        assertThat(login(STORE_B, "dario@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
        register(STORE_B, "Dario", "dario@mail.test", "propia9876");
        assertThat(login(STORE_B, "dario@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
        String tokenB = buyerLogin(STORE_B, "dario@mail.test", "propia9876");

        // El token de una tienda no sirve en la otra.
        assertThat(call(tokenA, "GET", "/store/me", null, STORE_B).status()).isEqualTo(401);
        assertThat(call(tokenB, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(customerNames(adminB, "WEB")).containsExactly("Dario");
    }

    @Test
    void buyerAndEmployeeTokensDoNotMix() {
        register(STORE_A, "Eva", "eva@mail.test", PASSWORD);
        String buyer = buyerLogin(STORE_A, "eva@mail.test", PASSWORD);

        assertThat(call(null, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(adminA, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(buyer, "GET", "/customers", null, null).status()).isEqualTo(401);
        // El catálogo sigue público aunque llegue un token cualquiera.
        assertThat(call("basura", "GET", "/store/info", null, STORE_A).status()).isEqualTo(200);
    }

    @Test
    void aCustomerDeactivatedInTheErpCanNoLongerUseTheStore() {
        register(STORE_A, "Facundo", "facundo@mail.test", PASSWORD);
        String token = buyerLogin(STORE_A, "facundo@mail.test", PASSWORD);
        Long customerId = customerId(adminA, "Facundo");

        ok(call(adminA, "PATCH", "/customers/" + customerId + "/deactivate", null, null));

        assertThat(call(token, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(login(STORE_A, "facundo@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
    }

    @Test
    void invalidRegistrationsAndWrongPasswordsAreRejected() {
        assertThat(register(STORE_A, "Gala", "gala@mail.test", "sinnumeros").status()).isEqualTo(400);
        assertThat(register(STORE_A, "Gala", "no-es-un-email", PASSWORD).status()).isEqualTo(400);
        assertThat(login(STORE_A, "nadie@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
    }

    private Response register(String store, String firstName, String email, String password) {
        return call(null, "POST", "/store/auth/register", Map.of(
                "firstName", firstName, "lastName", "Prueba", "email", email, "password", password), store);
    }

    private Response login(String store, String email, String password) {
        return call(null, "POST", "/store/auth/login", Map.of("email", email, "password", password), store);
    }

    private String buyerLogin(String store, String email, String password) {
        return ok(login(store, email, password)).get("token").asString();
    }

    private List<String> customerNames(String token, String origin) {
        JsonNode content = ok(call(token, "GET", "/customers?size=100&origin=" + origin, null, null)).get("content");
        List<String> names = new ArrayList<>();
        for (int i = 0; i < content.size(); i++) {
            names.add(content.get(i).get("firstName").asString());
        }
        return names;
    }

    private Long customerId(String token, String firstName) {
        JsonNode content = ok(call(token, "GET", "/customers?size=100", null, null)).get("content");
        for (int i = 0; i < content.size(); i++) {
            if (content.get(i).get("firstName").asString().equals(firstName)) {
                return content.get(i).get("id").asLong();
            }
        }
        throw new AssertionError("No customer named " + firstName);
    }

    private String provision(String platform, String companyName, String admin, String domain) {
        JsonNode created = ok(call(platform, "POST", "/provisioning/companies", Map.of(
                "companyName", companyName, "adminUsername", admin, "adminEmail", admin + "@x.com"), null));
        ok(call(platform, "PATCH", "/provisioning/companies/" + created.get("companyId").asLong() + "/store",
                Map.of("storeDomain", domain, "storeEnabled", true), null));
        return ok(call(null, "POST", "/auth/login",
                Map.of("username", admin, "password", created.get("temporaryPassword").asString()), null))
                .get("token").asString();
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
        Map<String, String> headers = new HashMap<>();
        if (token != null) {
            headers.put("Authorization", "Bearer " + token);
        }
        if (storeDomain != null) {
            headers.put("X-Store-Domain", storeDomain);
        }
        headers.forEach(builder::header);
        try {
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body());
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path, e);
        }
    }
}
