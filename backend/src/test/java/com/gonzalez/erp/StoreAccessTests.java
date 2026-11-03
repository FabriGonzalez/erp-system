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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * Acceso a la tienda web contra la API real: la tienda se reconoce por su dominio (X-Store-Domain u
 * Origin), una tienda inexistente o apagada responde 404, el CORS solo se le da a dominios
 * registrados y el token de empleado no participa en /store/**.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin"
})
@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StoreAccessTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

    private static final TimeZone originalTimeZone = TimeZone.getDefault();

    // Mismo motivo que en TenantIsolationTests: con la zona de Windows Postgres rechaza la conexión.
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    @Value("${local.server.port}")
    private int port;

    private String platform;
    private final Map<String, Long> companies = new LinkedHashMap<>();
    private final Map<String, String> temporaryPasswords = new LinkedHashMap<>();
    private String suspendedAdminToken;

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @BeforeAll
    void createStores() {
        platform = login("platform_admin", "test-platform-admin");
        provision("Tienda A", "admin_tienda_a");
        provision("Tienda B", "admin_tienda_b");
        provision("Tienda C", "admin_tienda_c");
        suspendedAdminToken = provision("Tienda Suspendida", "admin_tienda_s");

        ok(call(platform, "PATCH", "/provisioning/companies/" + companies.get("Tienda A") + "/store",
                Map.of("storeDomain", "HTTPS://Tienda-A.test/", "storeEnabled", true), Map.of()));
        ok(call(platform, "PATCH", "/provisioning/companies/" + companies.get("Tienda B") + "/store",
                Map.of("storeDomain", "tienda-b.test", "storeEnabled", false), Map.of()));
        ok(call(platform, "PATCH", "/provisioning/companies/" + companies.get("Tienda C") + "/store",
                Map.of("storeDomain", "tienda-c.test", "storeEnabled", true), Map.of()));
        ok(call(platform, "PATCH", "/provisioning/companies/" + companies.get("Tienda C") + "/status",
                Map.of("status", "SUSPENDED", "reason", "Prueba"), Map.of()));
        ok(call(platform, "PATCH", "/provisioning/companies/" + companies.get("Tienda Suspendida") + "/status",
                Map.of("status", "SUSPENDED", "reason", "Prueba"), Map.of()));
    }

    @Test
    void theStoreIsRecognizedByItsDomainWithoutLogin() {
        JsonNode byHeader = ok(store(Map.of("X-Store-Domain", "tienda-a.test")));
        assertThat(byHeader.get("name").asString()).isEqualTo("Tienda A");
        assertThat(byHeader.get("domain").asString()).isEqualTo("tienda-a.test");

        assertThat(ok(store(Map.of("Origin", "https://tienda-a.test"))).get("name").asString()).isEqualTo("Tienda A");
    }

    @Test
    void anUnknownDisabledOrSuspendedStoreIsNotFound() {
        assertThat(store(Map.of())).satisfies(r -> assertThat(r.hasCode("STORE_NOT_FOUND")).as(r.toString()).isTrue());
        assertThat(store(Map.of("X-Store-Domain", "no-existe.test")).hasCode("STORE_NOT_FOUND")).isTrue();
        assertThat(store(Map.of("X-Store-Domain", "tienda-b.test")).hasCode("STORE_NOT_FOUND")).isTrue();
        assertThat(store(Map.of("X-Store-Domain", "tienda-c.test")).hasCode("STORE_NOT_FOUND")).isTrue();
        // Coincidencia exacta: www es otro dominio.
        assertThat(store(Map.of("X-Store-Domain", "www.tienda-a.test")).hasCode("STORE_NOT_FOUND")).isTrue();
    }

    @Test
    void corsIsOnlyGrantedToRegisteredStores() {
        Response registered = store(Map.of("Origin", "https://tienda-a.test"));
        assertThat(registered.header("Access-Control-Allow-Origin")).contains("https://tienda-a.test");

        // Una página ajena que dice ser la tienda A: el backend responde, pero el navegador no le deja leerlo.
        Response foreign = store(Map.of("Origin", "https://malicioso.test", "X-Store-Domain", "tienda-a.test"));
        assertThat(foreign.status()).isEqualTo(200);
        assertThat(foreign.header("Access-Control-Allow-Origin")).isEmpty();

        assertThat(preflight("https://tienda-a.test").header("Access-Control-Allow-Origin"))
                .contains("https://tienda-a.test");
        assertThat(preflight("https://malicioso.test").header("Access-Control-Allow-Origin")).isEmpty();
        // Una tienda apagada tampoco recibe permiso.
        assertThat(preflight("https://tienda-b.test").header("Access-Control-Allow-Origin")).isEmpty();
    }

    @Test
    void theEmployeeTokenIsIgnoredInTheStore() {
        // En el ERP este token responde 401 COMPANY_SUSPENDED; en la tienda no se mira.
        assertThat(call(suspendedAdminToken, "GET", "/branches", null, Map.of()).hasCode("COMPANY_SUSPENDED")).isTrue();
        assertThat(call(suspendedAdminToken, "GET", "/store/info", null, Map.of("X-Store-Domain", "tienda-a.test")).status())
                .isEqualTo(200);
        assertThat(call("basura", "GET", "/store/info", null, Map.of("X-Store-Domain", "tienda-a.test")).status())
                .isEqualTo(200);
    }

    @Test
    void onlyTheOperatorConfiguresTheStoreAndDomainsAreUnique() {
        String path = "/provisioning/companies/" + companies.get("Tienda B") + "/store";

        assertThat(call(platform, "PATCH", path, Map.of("storeDomain", "tienda-a.test", "storeEnabled", true), Map.of())
                .hasCode("STORE_DOMAIN_ALREADY_EXISTS")).isTrue();
        assertThat(call(platform, "PATCH", path, Map.of("storeDomain", "", "storeEnabled", true), Map.of()).status())
                .isEqualTo(400);
        assertThat(call(platform, "PATCH", path, Map.of("storeDomain", "no es un dominio", "storeEnabled", false), Map.of())
                .status()).isEqualTo(400);

        String companyAdmin = login("admin_tienda_b", temporaryPasswords.get("admin_tienda_b"));
        assertThat(call(companyAdmin, "PATCH", path, Map.of("storeDomain", "robado.test", "storeEnabled", true), Map.of())
                .status()).isEqualTo(403);
    }

    private String provision(String companyName, String admin) {
        JsonNode created = ok(call(platform, "POST", "/provisioning/companies", Map.of(
                "companyName", companyName,
                "adminUsername", admin,
                "adminEmail", admin + "@x.com"), Map.of()));
        companies.put(companyName, created.get("companyId").asLong());
        String password = created.get("temporaryPassword").asString();
        temporaryPasswords.put(admin, password);
        return login(admin, password);
    }

    private Response store(Map<String, String> headers) {
        return call(null, "GET", "/store/info", null, headers);
    }

    private Response preflight(String origin) {
        return call(null, "OPTIONS", "/store/info", null, Map.of(
                "Origin", origin,
                "Access-Control-Request-Method", "GET"));
    }

    private record Response(int status, String body, Map<String, List<String>> headers) {
        boolean hasCode(String code) {
            return status >= 400 && status < 500 && body.contains("\"code\":\"" + code + "\"");
        }

        Optional<String> header(String name) {
            return headers.entrySet().stream()
                    .filter(entry -> entry.getKey().equalsIgnoreCase(name))
                    .flatMap(entry -> entry.getValue().stream())
                    .findFirst();
        }

        @Override
        public String toString() {
            return status + " " + body;
        }
    }

    private String login(String username, String password) {
        return ok(call(null, "POST", "/auth/login",
                Map.of("username", username, "password", password), Map.of())).get("token").asString();
    }

    private JsonNode ok(Response response) {
        assertThat(response.status()).as(response.toString()).isBetween(200, 299);
        return response.body().isEmpty() ? json.createObjectNode() : json.readTree(response.body());
    }

    private Response call(String token, String method, String path, Object body, Map<String, String> headers) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                .header("Content-Type", "application/json")
                .method(method, body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        headers.forEach(builder::header);
        try {
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body(), response.headers().map());
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path, e);
        }
    }
}
