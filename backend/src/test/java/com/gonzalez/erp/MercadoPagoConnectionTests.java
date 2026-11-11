package com.gonzalez.erp;

import com.gonzalez.erp.common.crypto.AesGcmTokenCipher;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoOAuthClient;
import com.gonzalez.erp.modules.mercadopago.client.MercadoPagoOAuthClient.Tokens;
import com.gonzalez.erp.modules.mercadopago.exception.MercadoPagoException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.util.UriComponentsBuilder;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/*
 * Conexión de la cuenta de Mercado Pago contra Postgres real. Mercado Pago está simulado: los
 * tests arman el viaje del navegador (URL de autorización → callback) y controlan qué cuenta
 * devuelve el cambio del código.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin",
        "app.security.login.max-failures-per-ip=1000",
        "app.encryption.key=" + MercadoPagoConnectionTests.ENCRYPTION_KEY,
        "app.mercadopago.client-id=123456",
        "app.mercadopago.client-secret=secreto-de-la-app",
        "app.mercadopago.redirect-uri=https://api.erp.test/api/v1/mercadopago/oauth/callback"
})
@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MercadoPagoConnectionTests {

    static final String ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

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

    @MockitoBean
    private MercadoPagoOAuthClient oauthClient;

    @Autowired
    private JdbcTemplate jdbc;

    private String platform;

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @BeforeAll
    void login() {
        platform = ok(call(null, "POST", "/auth/login",
                Map.of("username", "platform_admin", "password", "test-platform-admin"))).get("token").asString();
    }

    @Test
    void connectsTheAccountWithPkceAndStoresTheTokensEncrypted() throws Exception {
        Company company = provision("MP Conecta", "admin_mp_conecta");
        when(oauthClient.exchangeCode(eq("code-conecta"), anyString()))
                .thenReturn(new Tokens("APP_USR-access-conecta", "TG-refresh-conecta", 15_552_000, 1001L, true));

        assertThat(ok(call(company.token(), "GET", "/companies/me/mercadopago", null)).get("connected").asBoolean()).isFalse();

        MultiValueMap<String, String> params = authorizationParams(company.token());
        assertThat(params.getFirst("client_id")).isEqualTo("123456");
        assertThat(params.getFirst("response_type")).isEqualTo("code");
        assertThat(params.getFirst("redirect_uri")).isEqualTo("https://api.erp.test/api/v1/mercadopago/oauth/callback");
        assertThat(params.getFirst("code_challenge_method")).isEqualTo("S256");

        Response callback = callback("code-conecta", params.getFirst("state"));
        assertThat(callback.status()).isEqualTo(200);
        assertThat(callback.body()).contains("Cuenta conectada");

        // PKCE: el verificador que llega al cambio del código es el que corresponde al challenge.
        ArgumentCaptor<String> verifier = ArgumentCaptor.forClass(String.class);
        verify(oauthClient).exchangeCode(eq("code-conecta"), verifier.capture());
        assertThat(challengeOf(verifier.getValue())).isEqualTo(params.getFirst("code_challenge"));

        JsonNode connection = ok(call(company.token(), "GET", "/companies/me/mercadopago", null));
        assertThat(connection.get("connected").asBoolean()).isTrue();
        assertThat(connection.get("mpUserId").asLong()).isEqualTo(1001L);
        assertThat(connection.get("liveMode").asBoolean()).isTrue();
        assertThat(connection.toString()).doesNotContain("APP_USR").doesNotContain("TG-refresh");

        Map<String, Object> row = jdbc.queryForMap(
                "SELECT access_token_encrypted, refresh_token_encrypted, connected_by_user_id "
                        + "FROM mercado_pago_connections WHERE company_id = ?", company.id());
        AesGcmTokenCipher cipher = new AesGcmTokenCipher(ENCRYPTION_KEY);
        assertThat((String) row.get("access_token_encrypted")).doesNotContain("APP_USR");
        assertThat(cipher.decrypt((String) row.get("access_token_encrypted"))).isEqualTo("APP_USR-access-conecta");
        assertThat(cipher.decrypt((String) row.get("refresh_token_encrypted"))).isEqualTo("TG-refresh-conecta");
        assertThat(row.get("connected_by_user_id")).isNotNull();
    }

    @Test
    void anAccountConnectedToOneCompanyCannotBeConnectedToAnother() {
        Company first = provision("MP Primera", "admin_mp_primera");
        Company second = provision("MP Segunda", "admin_mp_segunda");
        when(oauthClient.exchangeCode(eq("code-primera"), anyString()))
                .thenReturn(new Tokens("APP_USR-primera", "TG-primera", 15_552_000, 2002L, false));
        when(oauthClient.exchangeCode(eq("code-segunda"), anyString()))
                .thenReturn(new Tokens("APP_USR-segunda", "TG-segunda", 15_552_000, 2002L, false));

        assertThat(callback("code-primera", authorizationParams(first.token()).getFirst("state")).status()).isEqualTo(200);

        Response rejected = callback("code-segunda", authorizationParams(second.token()).getFirst("state"));
        assertThat(rejected.status()).isEqualTo(409);
        assertThat(rejected.body()).contains("ya está conectada a otra empresa");
        assertThat(ok(call(second.token(), "GET", "/companies/me/mercadopago", null)).get("connected").asBoolean()).isFalse();

        // Al desconectarla de la primera, la segunda ya puede usarla.
        assertThat(call(first.token(), "DELETE", "/companies/me/mercadopago", null).status()).isEqualTo(204);
        assertThat(ok(call(first.token(), "GET", "/companies/me/mercadopago", null)).get("connected").asBoolean()).isFalse();
        assertThat(callback("code-segunda", authorizationParams(second.token()).getFirst("state")).status()).isEqualTo(200);
        assertThat(ok(call(second.token(), "GET", "/companies/me/mercadopago", null)).get("mpUserId").asLong()).isEqualTo(2002L);
    }

    @Test
    void reconnectingReplacesTheAccount() {
        Company company = provision("MP Reconecta", "admin_mp_reconecta");
        when(oauthClient.exchangeCode(eq("code-vieja"), anyString()))
                .thenReturn(new Tokens("APP_USR-vieja", "TG-vieja", 15_552_000, 3003L, false));
        when(oauthClient.exchangeCode(eq("code-nueva"), anyString()))
                .thenReturn(new Tokens("APP_USR-nueva", "TG-nueva", 15_552_000, 3004L, true));

        assertThat(callback("code-vieja", authorizationParams(company.token()).getFirst("state")).status()).isEqualTo(200);
        assertThat(callback("code-nueva", authorizationParams(company.token()).getFirst("state")).status()).isEqualTo(200);

        JsonNode connection = ok(call(company.token(), "GET", "/companies/me/mercadopago", null));
        assertThat(connection.get("mpUserId").asLong()).isEqualTo(3004L);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM mercado_pago_connections WHERE company_id = ?",
                Long.class, company.id())).isEqualTo(1L);
    }

    @Test
    void anInvalidOrExpiredStateNeverReachesMercadoPago() {
        Company company = provision("MP State", "admin_mp_state");
        AesGcmTokenCipher cipher = new AesGcmTokenCipher(ENCRYPTION_KEY);
        // Mismo formato que arma el servicio (empresa:usuario:vencimiento:verificador), ya vencido.
        String expired = cipher.encrypt(company.id() + "::" + Instant.now().minusSeconds(60).getEpochSecond() + ":verificador");
        String fromOtherKey = new AesGcmTokenCipher(Base64.getEncoder().encodeToString(new byte[] {
                9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9}))
                .encrypt(company.id() + "::" + Instant.now().plusSeconds(600).getEpochSecond() + ":verificador");

        for (String state : new String[] {expired, fromOtherKey, "inventado", "v1:abc"}) {
            Response response = callback("code-state", state);
            assertThat(response.status()).as(state).isEqualTo(400);
            assertThat(response.body()).contains("El link venció o no es válido");
        }
        assertThat(callback("code-state", null).status()).isEqualTo(400);
        verify(oauthClient, never()).exchangeCode(eq("code-state"), anyString());
    }

    @Test
    void cancellingInMercadoPagoShowsAPageAndChangesNothing() {
        Response response = get("/mercadopago/oauth/callback?error=access_denied&state=x");

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.body()).contains("No se conectó la cuenta");
    }

    @Test
    void whenMercadoPagoFailsTheAdminSeesItAndNothingIsStored() {
        Company company = provision("MP Falla", "admin_mp_falla");
        when(oauthClient.exchangeCode(eq("code-falla"), anyString())).thenThrow(MercadoPagoException.connectionFailed());

        Response response = callback("code-falla", authorizationParams(company.token()).getFirst("state"));

        assertThat(response.status()).isEqualTo(502);
        assertThat(response.body()).contains("Mercado Pago no respondió");
        assertThat(ok(call(company.token(), "GET", "/companies/me/mercadopago", null)).get("connected").asBoolean()).isFalse();
    }

    @Test
    void theAdminEndpointsNeedTheErpToken() {
        assertThat(call(null, "GET", "/companies/me/mercadopago/connect", null).status()).isEqualTo(401);
        assertThat(call(null, "GET", "/companies/me/mercadopago", null).status()).isEqualTo(401);
        assertThat(call(null, "DELETE", "/companies/me/mercadopago", null).status()).isEqualTo(401);
    }

    private record Company(long id, String token) {}

    private Company provision(String companyName, String admin) {
        JsonNode created = ok(call(platform, "POST", "/provisioning/companies", Map.of(
                "companyName", companyName, "adminUsername", admin, "adminEmail", admin + "@x.com")));
        String token = ok(call(null, "POST", "/auth/login",
                Map.of("username", admin, "password", created.get("temporaryPassword").asString())))
                .get("token").asString();
        return new Company(created.get("companyId").asLong(), token);
    }

    private MultiValueMap<String, String> authorizationParams(String token) {
        String url = ok(call(token, "GET", "/companies/me/mercadopago/connect", null)).get("authorizationUrl").asString();
        assertThat(url).startsWith("https://auth.mercadopago.com/authorization?");
        MultiValueMap<String, String> encoded = UriComponentsBuilder.fromUriString(url).build().getQueryParams();
        MultiValueMap<String, String> decoded = new LinkedMultiValueMap<>();
        encoded.forEach((name, values) -> values.forEach(value ->
                decoded.add(name, URLDecoder.decode(value, StandardCharsets.UTF_8))));
        return decoded;
    }

    private Response callback(String code, String state) {
        String query = "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                + (state == null ? "" : "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8));
        return get("/mercadopago/oauth/callback?" + query);
    }

    private static String challengeOf(String verifier) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
    }

    private record Response(int status, String body) {
        @Override
        public String toString() {
            return status + " " + body;
        }
    }

    private JsonNode ok(Response response) {
        assertThat(response.status()).as(response.toString()).isBetween(200, 299);
        return response.body().isEmpty() ? json.createObjectNode() : json.readTree(response.body());
    }

    private Response get(String path) {
        return send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path)).GET());
    }

    private Response call(String token, String method, String path, Object body) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                .header("Content-Type", "application/json")
                .method(method, body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return send(builder);
    }

    private Response send(HttpRequest.Builder builder) {
        try {
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body());
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
