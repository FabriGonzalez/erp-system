package com.gonzalez.erp;

import com.gonzalez.erp.modules.store.security.GoogleTokenVerifier;
import com.gonzalez.erp.modules.store.security.GoogleTokenVerifier.GoogleIdentity;
import jakarta.mail.Address;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.mockito.Mockito;
import org.mockito.invocation.Invocation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
import java.util.Properties;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * Cuentas de comprador contra Postgres real: registro pendiente hasta verificar el email, sin
 * revelar cuentas existentes, fichas WEB separadas de las del ERP, una cuenta por tienda, que el
 * token de comprador, el de empleado y el de otra tienda no se mezclen, y la recuperación de contraseña. El envío de mails está
 * simulado: los tests leen los links de los mails que se habrían mandado.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin",
        // Todos los pedidos salen de la misma IP: el límite por IP se prueba en LoginAttemptServiceTest.
        "app.security.login.max-failures-per-ip=1000"
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
    private static final Pattern LINK_TOKEN = Pattern.compile("/cuenta/(?:verificar|restablecer)\\?token=([A-Za-z0-9_-]+)");

    // Mismo motivo que en TenantIsolationTests: con la zona de Windows Postgres rechaza la conexión.
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    @Value("${local.server.port}")
    private int port;

    @MockitoBean
    private JavaMailSender mailSender;

    // Simulado: la firma real de Google se prueba en GoogleTokenVerifierTest.
    @MockitoBean
    private GoogleTokenVerifier googleTokenVerifier;

    @Autowired
    private JdbcTemplate jdbc;

    private String platform;
    private String adminA;
    private String adminB;

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @BeforeAll
    void createStores() {
        platform = ok(call(null, "POST", "/auth/login",
                Map.of("username", "platform_admin", "password", "test-platform-admin"), null)).get("token").asString();
        adminA = provision(platform, "Cuentas A", "admin_cuentas_a", STORE_A);
        adminB = provision(platform, "Cuentas B", "admin_cuentas_b", STORE_B);
    }

    @Test
    void theAccountAndTheWebCustomerAreCreatedOnlyWhenTheEmailIsVerified() {
        assertThat(register(STORE_A, "Ana", "ana@mail.test", PASSWORD).status()).isEqualTo(202);

        // Pendiente: el ERP no la ve y el login avisa que falta verificar (solo con la contraseña correcta).
        assertThat(customerNames(adminA, "WEB")).doesNotContain("Ana");
        assertThat(login(STORE_A, "ana@mail.test", PASSWORD).hasCode("EMAIL_NOT_VERIFIED")).isTrue();
        assertThat(login(STORE_A, "ana@mail.test", "otra5678").hasCode("INVALID_CREDENTIALS")).isTrue();

        Mail mail = lastMailTo("ana@mail.test", 1);
        assertThat(mail.subject()).isEqualTo("Confirmá tu email en Cuentas A");
        assertThat(mail.from()).contains("Cuentas A");
        assertThat(mail.body()).contains("https://" + STORE_A + "/cuenta/verificar?token=");
        assertThat(verify(STORE_A, mail.token()).status()).isEqualTo(204);

        String token = buyerLogin(STORE_A, "ANA@mail.test", PASSWORD);
        JsonNode me = ok(call(token, "GET", "/store/me", null, STORE_A));
        assertThat(me.get("firstName").asString()).isEqualTo("Ana");
        assertThat(me.get("email").asString()).isEqualTo("ana@mail.test");
        assertThat(me.get("emailVerified").asBoolean()).isTrue();
        // Nada de la ficha del ERP.
        assertThat(me.has("observations")).isFalse();
        assertThat(me.has("id")).isFalse();

        assertThat(customerNames(adminA, "WEB")).contains("Ana");
    }

    @Test
    void mailsGoOutFromTheStoreSenderOrFromTheDefault() {
        // Tienda propia: cambiarle el remitente no afecta a los demás tests.
        String domain = "remitente.test";
        provision(platform, "Remitente", "admin_remitente", domain);
        String storePath = "/provisioning/companies/" + companyIdByDomain(domain) + "/store";

        JsonNode configured = ok(call(platform, "PATCH", storePath, Map.of(
                "storeDomain", domain, "storeEnabled", true, "storeMailFrom", " Avisos@Remitente.test "), null));
        assertThat(configured.get("storeMailFrom").asString()).isEqualTo("avisos@remitente.test");
        assertThat(call(platform, "PATCH", storePath, Map.of(
                "storeDomain", domain, "storeEnabled", true, "storeMailFrom", "no-es-un-email"), null).status())
                .isEqualTo(400);

        register(domain, "Rita", "rita@mail.test", PASSWORD);
        assertThat(lastMailTo("rita@mail.test", 1).from()).isEqualTo("Remitente <avisos@remitente.test>");

        // Sin remitente en la configuración se borra y vuelve a MAIL_FROM.
        JsonNode cleared = ok(call(platform, "PATCH", storePath,
                Map.of("storeDomain", domain, "storeEnabled", true), null));
        assertThat(cleared.get("storeMailFrom").isNull()).isTrue();
        register(domain, "Raúl", "raul@mail.test", PASSWORD);
        assertThat(lastMailTo("raul@mail.test", 1).from()).isEqualTo("Remitente <no-reply@erp.local>");
    }

    private Long companyIdByDomain(String domain) {
        return jdbc.queryForObject("SELECT id FROM companies WHERE store_domain = ?", Long.class, domain);
    }

    @Test
    void aForeignPendingRegistrationNeverBecomesTheAccount() {
        // Un intruso se registra primero con el email de Hilda; después se registra ella.
        register(STORE_A, "Intruso", "hilda@mail.test", "intruso123");
        String intruderLink = lastMailTo("hilda@mail.test", 1).token();
        register(STORE_A, "Hilda", "hilda@mail.test", PASSWORD);
        String ownerLink = lastMailTo("hilda@mail.test", 2).token();

        // Hilda toca su link: la cuenta tiene sus datos y su contraseña, y el link del intruso muere.
        assertThat(verify(STORE_A, ownerLink).status()).isEqualTo(204);
        assertThat(login(STORE_A, "hilda@mail.test", "intruso123").hasCode("INVALID_CREDENTIALS")).isTrue();
        assertThat(ok(call(buyerLogin(STORE_A, "hilda@mail.test", PASSWORD), "GET", "/store/me", null, STORE_A))
                .get("firstName").asString()).isEqualTo("Hilda");
        assertThat(verify(STORE_A, intruderLink).hasCode("INVALID_LINK")).isTrue();
        assertThat(customerNames(adminA, "WEB")).doesNotContain("Intruso");
    }

    @Test
    void verificationLinksAreSingleUseAndBelongToTheirStore() {
        register(STORE_A, "Ines", "ines@mail.test", PASSWORD);
        String link = lastMailTo("ines@mail.test", 1).token();

        assertThat(verify(STORE_B, link).hasCode("INVALID_LINK")).isTrue();
        assertThat(verify(STORE_A, "inventado").hasCode("INVALID_LINK")).isTrue();
        assertThat(verify(STORE_A, link).status()).isEqualTo(204);
        assertThat(verify(STORE_A, link).hasCode("INVALID_LINK")).isTrue();
    }

    @Test
    void anExpiredLinkIsRejectedAndResendingGivesANewOne() {
        register(STORE_A, "Julia", "julia@mail.test", PASSWORD);
        String expired = lastMailTo("julia@mail.test", 1).token();
        jdbc.update("UPDATE store_pending_registrations SET expires_at = now() - interval '1 minute' WHERE email = ?",
                "julia@mail.test");

        assertThat(verify(STORE_A, expired).hasCode("INVALID_LINK")).isTrue();
        assertThat(login(STORE_A, "julia@mail.test", PASSWORD).hasCode("EMAIL_NOT_VERIFIED")).isTrue();

        assertThat(resend(STORE_A, "julia@mail.test").status()).isEqualTo(202);
        String renewed = lastMailTo("julia@mail.test", 2).token();
        assertThat(renewed).isNotEqualTo(expired);
        assertThat(verify(STORE_A, renewed).status()).isEqualTo(204);
        buyerLogin(STORE_A, "julia@mail.test", PASSWORD);

        // Sin registro pendiente (verificado o inexistente) responde igual y no manda nada.
        assertThat(resend(STORE_A, "julia@mail.test").status()).isEqualTo(202);
        assertThat(resend(STORE_A, "nadie-registrado@mail.test").status()).isEqualTo(202);
        pause();
        assertThat(mailsTo("julia@mail.test")).hasSize(2);
        assertThat(mailsTo("nadie-registrado@mail.test")).isEmpty();
    }

    @Test
    void anErpCustomerWithTheSameEmailIsNeverLinked() {
        ok(call(adminA, "POST", "/customers",
                Map.of("firstName", "Bruno del Local", "email", "bruno@mail.test"), null));

        registerAndVerify(STORE_A, "Bruno", "bruno@mail.test", PASSWORD);

        assertThat(customerNames(adminA, "ERP")).contains("Bruno del Local");
        assertThat(customerNames(adminA, "WEB")).contains("Bruno").doesNotContain("Bruno del Local");
        assertThat(ok(call(buyerLogin(STORE_A, "bruno@mail.test", PASSWORD), "GET", "/store/me", null, STORE_A))
                .get("firstName").asString()).isEqualTo("Bruno");
    }

    @Test
    void registeringAnExistingEmailLooksTheSameAndOnlyWarnsTheOwner() {
        registerAndVerify(STORE_A, "Carla", "carla@mail.test", PASSWORD);

        Response again = register(STORE_A, "Intrusa", "carla@mail.test", "otra5678");
        assertThat(again.status()).isEqualTo(202);
        assertThat(again.body()).isEmpty();

        Mail warning = lastMailTo("carla@mail.test", 2);
        assertThat(warning.subject()).isEqualTo("Ya tenés una cuenta en Cuentas A");
        assertThat(warning.body()).contains("Hola Carla").doesNotContain("token=");

        // La contraseña original sigue valiendo y la del segundo registro no.
        assertThat(login(STORE_A, "carla@mail.test", "otra5678").hasCode("INVALID_CREDENTIALS")).isTrue();
        assertThat(ok(call(buyerLogin(STORE_A, "carla@mail.test", PASSWORD), "GET", "/store/me", null, STORE_A))
                .get("firstName").asString()).isEqualTo("Carla");
        assertThat(customerNames(adminA, "WEB")).doesNotContain("Intrusa");
    }

    @Test
    void eachStoreHasItsOwnAccounts() {
        registerAndVerify(STORE_A, "Dario", "dario@mail.test", PASSWORD);
        String tokenA = buyerLogin(STORE_A, "dario@mail.test", PASSWORD);

        // En la tienda B no tiene cuenta hasta registrarse ahí, con su propia contraseña.
        assertThat(login(STORE_B, "dario@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
        registerAndVerify(STORE_B, "Dario", "dario@mail.test", "propia9876");
        assertThat(login(STORE_B, "dario@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
        String tokenB = buyerLogin(STORE_B, "dario@mail.test", "propia9876");

        // El token de una tienda no sirve en la otra.
        assertThat(call(tokenA, "GET", "/store/me", null, STORE_B).status()).isEqualTo(401);
        assertThat(call(tokenB, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(customerNames(adminB, "WEB")).containsExactly("Dario");
    }

    @Test
    void buyerAndEmployeeTokensDoNotMix() {
        registerAndVerify(STORE_A, "Eva", "eva@mail.test", PASSWORD);
        String buyer = buyerLogin(STORE_A, "eva@mail.test", PASSWORD);

        assertThat(call(null, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(adminA, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(buyer, "GET", "/customers", null, null).status()).isEqualTo(401);
        // El catálogo sigue público aunque llegue un token cualquiera.
        assertThat(call("basura", "GET", "/store/info", null, STORE_A).status()).isEqualTo(200);
    }

    @Test
    void aCustomerDeactivatedInTheErpCanNoLongerUseTheStore() {
        registerAndVerify(STORE_A, "Facundo", "facundo@mail.test", PASSWORD);
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

    @Test
    void registrationsForTheSameEmailAreLimited() {
        for (int i = 0; i < 5; i++) {
            assertThat(register(STORE_A, "Karina", "karina@mail.test", PASSWORD).status()).isEqualTo(202);
        }
        assertThat(register(STORE_A, "Karina", "karina@mail.test", PASSWORD).status()).isEqualTo(429);
        // El límite es por tienda: en la otra el mismo email sigue pudiendo registrarse.
        assertThat(register(STORE_B, "Karina", "karina@mail.test", PASSWORD).status()).isEqualTo(202);
    }

    @Test
    void recoveringThePasswordUnblocksTheAccountAndClosesOtherSessions() {
        registerAndVerify(STORE_A, "Lara", "lara@mail.test", PASSWORD);
        String oldSession = buyerLogin(STORE_A, "lara@mail.test", PASSWORD);
        for (int i = 0; i < 5; i++) {
            login(STORE_A, "lara@mail.test", "equivocada1");
        }
        assertThat(login(STORE_A, "lara@mail.test", PASSWORD).status()).isEqualTo(429);
        // El token guarda segundos: el cambio tiene que caer en un segundo posterior al login.
        waitNextSecond();

        assertThat(forgot(STORE_A, "lara@mail.test").status()).isEqualTo(202);
        Mail mail = lastMailTo("lara@mail.test", 2);
        assertThat(mail.subject()).isEqualTo("Restablecé tu contraseña de Cuentas A");
        assertThat(mail.body()).contains("https://" + STORE_A + "/cuenta/restablecer?token=");
        assertThat(reset(STORE_A, mail.token(), "nueva5678").status()).isEqualTo(204);

        assertThat(call(oldSession, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(login(STORE_A, "lara@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
        buyerLogin(STORE_A, "lara@mail.test", "nueva5678");
        // El link sirve una sola vez.
        assertThat(reset(STORE_A, mail.token(), "otra98765").hasCode("INVALID_LINK")).isTrue();

        Mail notice = lastMailTo("lara@mail.test", 3);
        assertThat(notice.subject()).isEqualTo("Cambió tu contraseña de Cuentas A");
        assertThat(notice.body()).contains("Hola Lara").doesNotContain("token=");
    }

    @Test
    void onlyTheLastResetLinkOfItsStoreWorksAndItExpires() {
        registerAndVerify(STORE_A, "Mario", "mario@mail.test", PASSWORD);
        forgot(STORE_A, "mario@mail.test");
        String first = lastMailTo("mario@mail.test", 2).token();
        forgot(STORE_A, "mario@mail.test");
        String second = lastMailTo("mario@mail.test", 3).token();

        assertThat(reset(STORE_A, first, "nueva5678").hasCode("INVALID_LINK")).isTrue();
        assertThat(reset(STORE_B, second, "nueva5678").hasCode("INVALID_LINK")).isTrue();
        assertThat(reset(STORE_A, "inventado", "nueva5678").hasCode("INVALID_LINK")).isTrue();
        // Una contraseña que no cumple la regla no gasta el link.
        assertThat(reset(STORE_A, second, "sinnumeros").status()).isEqualTo(400);

        jdbc.update("""
                UPDATE store_account_tokens SET expires_at = now() - interval '1 minute'
                WHERE store_account_id IN (SELECT id FROM store_accounts WHERE email = ?)
                """, "mario@mail.test");
        assertThat(reset(STORE_A, second, "nueva5678").hasCode("INVALID_LINK")).isTrue();
        buyerLogin(STORE_A, "mario@mail.test", PASSWORD);
    }

    @Test
    void recoveryLooksTheSameWithoutAnAccountAndSendsNothing() {
        // Sin cuenta, con el registro sin verificar o en otra tienda: misma respuesta y ningún mail.
        assertThat(forgot(STORE_A, "nadie-recupera@mail.test").status()).isEqualTo(202);
        register(STORE_A, "Nora", "nora@mail.test", PASSWORD);
        lastMailTo("nora@mail.test", 1);
        assertThat(forgot(STORE_A, "nora@mail.test").status()).isEqualTo(202);
        registerAndVerify(STORE_A, "Olga", "olga@mail.test", PASSWORD);
        assertThat(forgot(STORE_B, "olga@mail.test").status()).isEqualTo(202);

        pause();
        assertThat(mailsTo("nadie-recupera@mail.test")).isEmpty();
        assertThat(mailsTo("nora@mail.test")).hasSize(1);
        assertThat(mailsTo("olga@mail.test")).hasSize(1);
    }

    @Test
    void aDeactivatedCustomerCannotRecoverThePassword() {
        registerAndVerify(STORE_A, "Pedro", "pedro@mail.test", PASSWORD);
        forgot(STORE_A, "pedro@mail.test");
        String link = lastMailTo("pedro@mail.test", 2).token();

        ok(call(adminA, "PATCH", "/customers/" + customerId(adminA, "Pedro") + "/deactivate", null, null));

        assertThat(reset(STORE_A, link, "nueva5678").hasCode("INVALID_LINK")).isTrue();
        assertThat(forgot(STORE_A, "pedro@mail.test").status()).isEqualTo(202);
        pause();
        assertThat(mailsTo("pedro@mail.test")).hasSize(2);
    }

    @Test
    void recoveryRequestsForTheSameEmailAreLimited() {
        for (int i = 0; i < 5; i++) {
            assertThat(forgot(STORE_A, "quique@mail.test").status()).isEqualTo(202);
        }
        assertThat(forgot(STORE_A, "quique@mail.test").status()).isEqualTo(429);
    }

    @Test
    void theProfileIsTheFullFormAndKeepsTheErpData() {
        registerAndVerify(STORE_A, "Rosa", "rosa@mail.test", PASSWORD);
        String token = buyerLogin(STORE_A, "rosa@mail.test", PASSWORD);
        Long customerId = customerId(adminA, "Rosa");
        ok(call(adminA, "PATCH", "/customers/" + customerId, Map.of("firstName", "Rosa", "lastName", "Prueba",
                "email", "rosa@mail.test", "documentType", "DNI", "documentNumber", "30111222",
                "observations", "nota interna"), null));

        JsonNode updated = ok(call(token, "PATCH", "/store/me",
                Map.of("firstName", " Rosana ", "lastName", "Gomez", "phone", "1155556666"), STORE_A));
        assertThat(updated.get("firstName").asString()).isEqualTo("Rosana");
        assertThat(updated.get("phone").asString()).isEqualTo("1155556666");
        assertThat(updated.get("email").asString()).isEqualTo("rosa@mail.test");
        assertThat(updated.get("hasPassword").asBoolean()).isTrue();
        assertThat(updated.has("observations")).isFalse();

        // Sin teléfono en el formulario se borra; sin nombre se rechaza.
        JsonNode cleared = ok(call(token, "PATCH", "/store/me", Map.of("firstName", "Rosana", "lastName", "Gomez"), STORE_A));
        assertThat(cleared.get("phone").isNull()).isTrue();
        assertThat(call(token, "PATCH", "/store/me", Map.of("lastName", "Gomez"), STORE_A).status()).isEqualTo(400);

        JsonNode inErp = ok(call(adminA, "GET", "/customers/" + customerId, null, null));
        assertThat(inErp.get("firstName").asString()).isEqualTo("Rosana");
        assertThat(inErp.get("documentNumber").asString()).isEqualTo("30111222");
        assertThat(inErp.get("observations").asString()).isEqualTo("nota interna");
    }

    @Test
    void changingThePasswordKeepsThisSessionAndClosesTheOthers() {
        registerAndVerify(STORE_A, "Sara", "sara@mail.test", PASSWORD);
        String session = buyerLogin(STORE_A, "sara@mail.test", PASSWORD);
        String otherSession = buyerLogin(STORE_A, "sara@mail.test", PASSWORD);
        // El token guarda segundos: el cambio tiene que caer en un segundo posterior al login.
        waitNextSecond();

        assertThat(changePassword(session, "equivocada1", "nueva5678").hasCode("INVALID_CURRENT_PASSWORD")).isTrue();
        assertThat(changePassword(session, PASSWORD, PASSWORD).hasCode("PASSWORD_UNCHANGED")).isTrue();
        assertThat(changePassword(session, PASSWORD, "sinnumeros").status()).isEqualTo(400);
        assertThat(mailsTo("sara@mail.test")).hasSize(1);

        String renewed = ok(changePassword(session, PASSWORD, "nueva5678")).get("token").asString();

        assertThat(call(renewed, "GET", "/store/me", null, STORE_A).status()).isEqualTo(200);
        assertThat(call(session, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(otherSession, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        assertThat(login(STORE_A, "sara@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
        buyerLogin(STORE_A, "sara@mail.test", "nueva5678");

        assertThat(lastMailTo("sara@mail.test", 2).subject()).isEqualTo("Cambió tu contraseña de Cuentas A");
    }

    @Test
    void guessingTheCurrentPasswordIsLimited() {
        registerAndVerify(STORE_A, "Tania", "tania@mail.test", PASSWORD);
        String token = buyerLogin(STORE_A, "tania@mail.test", PASSWORD);

        for (int i = 0; i < 5; i++) {
            assertThat(changePassword(token, "equivocada1", "nueva5678").status()).isEqualTo(400);
        }
        assertThat(changePassword(token, PASSWORD, "nueva5678").status()).isEqualTo(429);
    }

    @Test
    void aGoogleOnlyAccountHasNoPasswordToChange() {
        registerAndVerify(STORE_A, "Ulises", "ulises@mail.test", PASSWORD);
        String token = buyerLogin(STORE_A, "ulises@mail.test", PASSWORD);
        jdbc.update("UPDATE store_accounts SET password_hash = NULL, google_subject = 'sub-ulises' WHERE email = ?",
                "ulises@mail.test");

        assertThat(ok(call(token, "GET", "/store/me", null, STORE_A)).get("hasPassword").asBoolean()).isFalse();
        assertThat(changePassword(token, PASSWORD, "nueva5678").hasCode("PASSWORD_NOT_SET")).isTrue();
    }

    @Test
    void addressesKeepExactlyOneMainAndShowOnlyActiveOnes() {
        registerAndVerify(STORE_A, "Vera", "vera@mail.test", PASSWORD);
        String token = buyerLogin(STORE_A, "vera@mail.test", PASSWORD);

        JsonNode first = ok(createAddress(token, STORE_A, "Calle 1", false));
        assertThat(first.get("mainAddress").asBoolean()).isTrue();
        assertThat(first.has("active")).isFalse();
        assertThat(first.has("createdAt")).isFalse();
        JsonNode second = ok(createAddress(token, STORE_A, "Calle 2", false));
        assertThat(second.get("mainAddress").asBoolean()).isFalse();
        JsonNode third = ok(createAddress(token, STORE_A, "Calle 3", true));
        assertThat(addressStreets(token, STORE_A)).containsExactly("Calle 3", "Calle 1", "Calle 2");

        JsonNode edited = ok(call(token, "PATCH", "/store/me/addresses/" + second.get("id").asLong(),
                Map.of("street", "Calle 2 bis", "city", "CABA", "mainAddress", true), STORE_A));
        assertThat(edited.get("mainAddress").asBoolean()).isTrue();
        assertThat(addressStreets(token, STORE_A)).containsExactly("Calle 2 bis", "Calle 1", "Calle 3");

        // Borrar la principal pasa el rol a la activa más antigua y la borrada ya no existe para el comprador.
        String secondPath = "/store/me/addresses/" + second.get("id").asLong();
        assertThat(call(token, "DELETE", secondPath, null, STORE_A).status()).isEqualTo(204);
        assertThat(addressStreets(token, STORE_A)).containsExactly("Calle 1", "Calle 3");
        assertThat(call(token, "DELETE", secondPath, null, STORE_A).status()).isEqualTo(404);
        assertThat(call(token, "PATCH", secondPath, Map.of("street", "X", "city", "Y"), STORE_A).status()).isEqualTo(404);
        assertThat(third.get("id").asLong()).isPositive();

        assertThat(call(token, "POST", "/store/me/addresses", Map.of("street", "Sin ciudad"), STORE_A).status()).isEqualTo(400);

        // El ERP ve las direcciones que cargó el comprador, para despachar los pedidos web.
        JsonNode inErp = ok(call(adminA, "GET", "/customers/" + customerId(adminA, "Vera") + "/addresses", null, null));
        assertThat(inErp.size()).isEqualTo(3);
    }

    @Test
    void aBuyerCanHaveUpToFiveActiveAddresses() {
        registerAndVerify(STORE_A, "Walter", "walter@mail.test", PASSWORD);
        String token = buyerLogin(STORE_A, "walter@mail.test", PASSWORD);
        long lastId = 0;
        for (int i = 1; i <= 5; i++) {
            lastId = ok(createAddress(token, STORE_A, "Calle " + i, false)).get("id").asLong();
        }

        assertThat(createAddress(token, STORE_A, "Calle 6", false).hasCode("ADDRESS_LIMIT_REACHED")).isTrue();

        // Las borradas no cuentan.
        assertThat(call(token, "DELETE", "/store/me/addresses/" + lastId, null, STORE_A).status()).isEqualTo(204);
        assertThat(createAddress(token, STORE_A, "Calle 6", false).status()).isEqualTo(201);
    }

    @Test
    void addressesBelongOnlyToTheirBuyer() {
        registerAndVerify(STORE_A, "Ximena", "ximena@mail.test", PASSWORD);
        String owner = buyerLogin(STORE_A, "ximena@mail.test", PASSWORD);
        registerAndVerify(STORE_A, "Yago", "yago@mail.test", PASSWORD);
        String other = buyerLogin(STORE_A, "yago@mail.test", PASSWORD);
        // Tienda propia: eachStoreHasItsOwnAccounts exige que en la B solo esté su comprador.
        String thirdStore = "direcciones-c.test";
        provision(platform, "Direcciones C", "admin_direcciones_c", thirdStore);
        registerAndVerify(thirdStore, "Zoe", "zoe@mail.test", PASSWORD);
        String otherStore = buyerLogin(thirdStore, "zoe@mail.test", PASSWORD);
        String path = "/store/me/addresses/" + ok(createAddress(owner, STORE_A, "Privada 1", false)).get("id").asLong();

        // Otro comprador, de esta tienda o de otra, no la encuentra aunque sepa el id.
        assertThat(addressStreets(other, STORE_A)).isEmpty();
        assertThat(call(other, "PATCH", path, Map.of("street", "X", "city", "Y"), STORE_A).status()).isEqualTo(404);
        assertThat(call(other, "DELETE", path, null, STORE_A).status()).isEqualTo(404);
        assertThat(call(otherStore, "DELETE", path, null, thirdStore).status()).isEqualTo(404);

        // Sin token de comprador válido para esta tienda no se llega al servicio.
        assertThat(call(null, "GET", "/store/me/addresses", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(adminA, "GET", "/store/me/addresses", null, STORE_A).status()).isEqualTo(401);
        assertThat(call(owner, "GET", "/store/me/addresses", null, thirdStore).status()).isEqualTo(401);
        assertThat(addressStreets(owner, STORE_A)).containsExactly("Privada 1");
    }

    @Test
    void theErpCannotChangeWhatTheBuyerManages() {
        registerAndVerify(STORE_A, "Abril", "abril@mail.test", PASSWORD);
        String token = buyerLogin(STORE_A, "abril@mail.test", PASSWORD);
        ok(call(token, "PATCH", "/store/me",
                Map.of("firstName", "Abril", "lastName", "Prueba", "phone", "1144443333"), STORE_A));
        Long addressId = ok(createAddress(token, STORE_A, "Calle Propia 1", false)).get("id").asLong();
        Long customerId = customerId(adminA, "Abril");
        String customerPath = "/customers/" + customerId;
        String addressesPath = customerPath + "/addresses";
        Map<String, Object> newAddress = Map.of("street", "Del ERP", "city", "CABA");

        for (String[] change : List.of(
                new String[] {"Otra", "Prueba", "1144443333", "abril@mail.test"},
                new String[] {"Abril", "Otro", "1144443333", "abril@mail.test"},
                new String[] {"Abril", "Prueba", "1100000000", "abril@mail.test"},
                new String[] {"Abril", "Prueba", "1144443333", "otro@mail.test"})) {
            assertThat(call(adminA, "PATCH", customerPath, Map.of("firstName", change[0], "lastName", change[1],
                    "phone", change[2], "email", change[3]), null).hasCode("CUSTOMER_MANAGED_BY_STORE")).isTrue();
        }
        // Tampoco se borra un dato por no mandarlo.
        assertThat(call(adminA, "PATCH", customerPath, Map.of("firstName", "Abril", "lastName", "Prueba",
                "email", "abril@mail.test"), null).hasCode("CUSTOMER_MANAGED_BY_STORE")).isTrue();

        assertThat(call(adminA, "POST", addressesPath, newAddress, null).hasCode("CUSTOMER_MANAGED_BY_STORE")).isTrue();
        assertThat(call(adminA, "PATCH", addressesPath + "/" + addressId, newAddress, null)
                .hasCode("CUSTOMER_MANAGED_BY_STORE")).isTrue();
        assertThat(call(adminA, "PATCH", addressesPath + "/" + addressId + "/deactivate", null, null)
                .hasCode("CUSTOMER_MANAGED_BY_STORE")).isTrue();
        assertThat(call(adminA, "PATCH", addressesPath + "/" + addressId + "/activate", null, null)
                .hasCode("CUSTOMER_MANAGED_BY_STORE")).isTrue();

        // Lo que no cambió no cuenta, aunque llegue con otros espacios o mayúsculas; lo interno sí se edita.
        JsonNode edited = ok(call(adminA, "PATCH", customerPath, Map.of("firstName", " Abril ", "lastName", "Prueba",
                "phone", " 1144443333 ", "email", "ABRIL@mail.test", "documentType", "DNI", "documentNumber", "30999888",
                "observations", "cliente frecuente"), null));
        assertThat(edited.get("documentNumber").asString()).isEqualTo("30999888");
        assertThat(edited.get("observations").asString()).isEqualTo("cliente frecuente");

        // El ERP sigue leyendo las direcciones y puede bloquear la ficha.
        assertThat(ok(call(adminA, "GET", addressesPath, null, null)).size()).isEqualTo(1);
        ok(call(adminA, "PATCH", customerPath + "/deactivate", null, null));
        assertThat(call(token, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        ok(call(adminA, "PATCH", customerPath + "/activate", null, null));

        assertThat(ok(call(token, "GET", "/store/me", null, STORE_A)).get("phone").asString()).isEqualTo("1144443333");
        assertThat(addressStreets(token, STORE_A)).containsExactly("Calle Propia 1");
    }

    @Test
    void anErpCustomerStaysFullyEditable() {
        Long customerId = ok(call(adminA, "POST", "/customers",
                Map.of("firstName", "Cliente del Local", "phone", "1122223333"), null)).get("id").asLong();
        String addressesPath = "/customers/" + customerId + "/addresses";

        JsonNode edited = ok(call(adminA, "PATCH", "/customers/" + customerId,
                Map.of("firstName", "Cliente Renombrado", "email", "local@mail.test"), null));
        assertThat(edited.get("firstName").asString()).isEqualTo("Cliente Renombrado");

        Long addressId = ok(call(adminA, "POST", addressesPath, Map.of("street", "Local 1", "city", "CABA"), null))
                .get("id").asLong();
        ok(call(adminA, "PATCH", addressesPath + "/" + addressId, Map.of("street", "Local 2", "city", "CABA"), null));
        ok(call(adminA, "PATCH", addressesPath + "/" + addressId + "/deactivate", null, null));
        ok(call(adminA, "PATCH", addressesPath + "/" + addressId + "/activate", null, null));
    }

    @Test
    void continuingWithGoogleCreatesAVerifiedWebAccountWithoutPassword() {
        ok(call(adminA, "POST", "/customers", Map.of("firstName", "Gala del Local", "email", "gala@mail.test"), null));
        register(STORE_A, "Intrusa", "gala@mail.test", PASSWORD);
        String pendingLink = lastMailTo("gala@mail.test", 1).token();

        assertThat(call(null, "POST", "/store/auth/google", Map.of("idToken", " "), STORE_A).status()).isEqualTo(400);

        String token = googleToken(STORE_A, new GoogleIdentity("sub-gala", "GALA@mail.test", true, "Gala", "Web"));
        JsonNode me = ok(call(token, "GET", "/store/me", null, STORE_A));
        assertThat(me.get("firstName").asString()).isEqualTo("Gala");
        assertThat(me.get("email").asString()).isEqualTo("gala@mail.test");
        assertThat(me.get("emailVerified").asBoolean()).isTrue();
        assertThat(me.get("hasPassword").asBoolean()).isFalse();

        // Ficha nueva: la del ERP con el mismo email sigue aparte y el registro pendiente quedó anulado.
        assertThat(customerNames(adminA, "ERP")).contains("Gala del Local");
        assertThat(customerNames(adminA, "WEB")).contains("Gala").doesNotContain("Intrusa");
        assertThat(verify(STORE_A, pendingLink).hasCode("INVALID_LINK")).isTrue();

        // El id de Google manda: con otro email en Google sigue siendo la misma cuenta.
        String again = googleToken(STORE_A, new GoogleIdentity("sub-gala", "gala.nueva@mail.test", true, "Gala", "Web"));
        assertThat(ok(call(again, "GET", "/store/me", null, STORE_A)).get("email").asString()).isEqualTo("gala@mail.test");
        assertThat(customerNames(adminA, "WEB")).containsOnlyOnce("Gala");

        assertThat(login(STORE_A, "gala@mail.test", PASSWORD).hasCode("INVALID_CREDENTIALS")).isTrue();
        assertThat(call(token, "GET", "/customers", null, null).status()).isIn(401, 403);
    }

    @Test
    void googleLinksToTheExistingAccountOfThatEmail() {
        registerAndVerify(STORE_A, "Hortensia", "hortensia@mail.test", PASSWORD);

        String token = googleToken(STORE_A, new GoogleIdentity("sub-hortensia", "hortensia@mail.test", true, "Otro", "Nombre"));

        JsonNode me = ok(call(token, "GET", "/store/me", null, STORE_A));
        assertThat(me.get("firstName").asString()).isEqualTo("Hortensia");
        assertThat(me.get("hasPassword").asBoolean()).isTrue();
        assertThat(customerNames(adminA, "WEB")).containsOnlyOnce("Hortensia").doesNotContain("Otro");
        assertThat(googleSubjectOf("hortensia@mail.test")).isEqualTo("sub-hortensia");
        buyerLogin(STORE_A, "hortensia@mail.test", PASSWORD);

        // Solo el mail de verificación: vincular no avisa.
        pause();
        assertThat(mailsTo("hortensia@mail.test")).hasSize(1);
    }

    @Test
    void googleNeedsAConfirmedEmailToCreateOrLinkAnAccount() {
        registerAndVerify(STORE_A, "Irene", "irene@mail.test", PASSWORD);

        assertThat(googleLogin(STORE_A, new GoogleIdentity("sub-irene", "irene@mail.test", false, "Irene", null))
                .hasCode("GOOGLE_LOGIN_FAILED")).isTrue();
        assertThat(googleSubjectOf("irene@mail.test")).isNull();
        assertThat(googleLogin(STORE_A, new GoogleIdentity("sub-sin-cuenta", "sincuenta@mail.test", false, "Sin", "Cuenta"))
                .hasCode("GOOGLE_LOGIN_FAILED")).isTrue();
        assertThat(customerNames(adminA, "WEB")).doesNotContain("Sin");

        // Ya vinculada, la identifica el id.
        googleToken(STORE_A, new GoogleIdentity("sub-irene", "irene@mail.test", true, "Irene", null));
        googleToken(STORE_A, new GoogleIdentity("sub-irene", "irene@mail.test", false, "Irene", null));
    }

    @Test
    void anEmailLinkedToAnotherGoogleIdIsRejected() {
        googleToken(STORE_A, new GoogleIdentity("sub-ana-acme", "ventas@acme.test", true, "Anita", "Acme"));

        assertThat(googleLogin(STORE_A, new GoogleIdentity("sub-otro-acme", "ventas@acme.test", true, "Reasignado", "Acme"))
                .hasCode("GOOGLE_LOGIN_FAILED")).isTrue();

        assertThat(googleSubjectOf("ventas@acme.test")).isEqualTo("sub-ana-acme");
        assertThat(customerNames(adminA, "WEB")).doesNotContain("Reasignado");
    }

    @Test
    void aDeactivatedCustomerCannotEnterWithGoogleNorGetLinked() {
        registerAndVerify(STORE_A, "Juana", "juana@mail.test", PASSWORD);
        String customerPath = "/customers/" + customerId(adminA, "Juana");
        GoogleIdentity identity = new GoogleIdentity("sub-juana", "juana@mail.test", true, "Juana", "Prueba");

        ok(call(adminA, "PATCH", customerPath + "/deactivate", null, null));
        assertThat(googleLogin(STORE_A, identity).hasCode("GOOGLE_LOGIN_FAILED")).isTrue();
        assertThat(googleSubjectOf("juana@mail.test")).isNull();

        ok(call(adminA, "PATCH", customerPath + "/activate", null, null));
        googleToken(STORE_A, identity);

        ok(call(adminA, "PATCH", customerPath + "/deactivate", null, null));
        assertThat(googleLogin(STORE_A, identity).hasCode("GOOGLE_LOGIN_FAILED")).isTrue();
    }

    @Test
    void eachStoreHasItsOwnGoogleAccountAndANamelessOneStaysEmpty() {
        // Tienda propia: una ficha sin nombre no puede mezclarse con los listados de los demás tests.
        String otherStore = "google-c.test";
        provision(platform, "Google C", "admin_google_c", otherStore);

        String inA = googleToken(STORE_A, new GoogleIdentity("sub-kira", "kira@mail.test", true, "Kira", "Prueba"));
        String inOther = googleToken(otherStore, new GoogleIdentity("sub-kira", "kira@mail.test", true, null, " "));

        assertThat(call(inA, "GET", "/store/me", null, otherStore).status()).isEqualTo(401);
        assertThat(call(inOther, "GET", "/store/me", null, STORE_A).status()).isEqualTo(401);
        JsonNode me = ok(call(inOther, "GET", "/store/me", null, otherStore));
        assertThat(me.path("firstName").isMissingNode() || me.path("firstName").isNull()).isTrue();
        assertThat(me.path("lastName").isMissingNode() || me.path("lastName").isNull()).isTrue();

        // Registrarse con ese email avisa que entre con Google: no tiene contraseña que recuperar.
        assertThat(register(otherStore, "Kira", "kira@mail.test", PASSWORD).status()).isEqualTo(202);
        Mail mail = lastMailTo("kira@mail.test", 1);
        assertThat(mail.body()).contains("Hola,").contains("Continuar con Google").doesNotContain("Olvidé");
    }

    private Response googleLogin(String store, GoogleIdentity identity) {
        Mockito.when(googleTokenVerifier.verify("id-token-de-google")).thenReturn(identity);
        return call(null, "POST", "/store/auth/google", Map.of("idToken", "id-token-de-google"), store);
    }

    private String googleToken(String store, GoogleIdentity identity) {
        return ok(googleLogin(store, identity)).get("token").asString();
    }

    private String googleSubjectOf(String email) {
        return jdbc.queryForObject("SELECT google_subject FROM store_accounts WHERE email = ?", String.class, email);
    }

    private Response changePassword(String token, String currentPassword, String newPassword) {
        return call(token, "PATCH", "/store/me/password",
                Map.of("currentPassword", currentPassword, "newPassword", newPassword), STORE_A);
    }

    private Response createAddress(String token, String store, String street, boolean main) {
        return call(token, "POST", "/store/me/addresses",
                Map.of("street", street, "city", "CABA", "mainAddress", main), store);
    }

    private List<String> addressStreets(String token, String store) {
        JsonNode addresses = ok(call(token, "GET", "/store/me/addresses", null, store));
        List<String> streets = new ArrayList<>();
        for (int i = 0; i < addresses.size(); i++) {
            streets.add(addresses.get(i).get("street").asString());
        }
        return streets;
    }

    private Response register(String store, String firstName, String email, String password) {
        return call(null, "POST", "/store/auth/register", Map.of(
                "firstName", firstName, "lastName", "Prueba", "email", email, "password", password), store);
    }

    private void registerAndVerify(String store, String firstName, String email, String password) {
        int before = mailsTo(email).size();
        assertThat(register(store, firstName, email, password).status()).isEqualTo(202);
        assertThat(verify(store, lastMailTo(email, before + 1).token()).status()).isEqualTo(204);
    }

    private Response verify(String store, String token) {
        return call(null, "POST", "/store/auth/verify-email", Map.of("token", token), store);
    }

    private Response resend(String store, String email) {
        return call(null, "POST", "/store/auth/resend-verification", Map.of("email", email), store);
    }

    private Response forgot(String store, String email) {
        return call(null, "POST", "/store/auth/forgot-password", Map.of("email", email), store);
    }

    private Response reset(String store, String token, String password) {
        return call(null, "POST", "/store/auth/reset-password", Map.of("token", token, "password", password), store);
    }

    private Response login(String store, String email, String password) {
        return call(null, "POST", "/store/auth/login", Map.of("email", email, "password", password), store);
    }

    private String buyerLogin(String store, String email, String password) {
        return ok(login(store, email, password)).get("token").asString();
    }

    private record Mail(String from, String subject, String body) {
        String token() {
            Matcher matcher = LINK_TOKEN.matcher(body);
            assertThat(matcher.find()).as("link in mail").isTrue();
            return matcher.group(1);
        }
    }

    /** Espera a que el mail número {@code count} para ese email se haya mandado (sale en otro hilo). */
    private Mail lastMailTo(String email, int count) {
        long deadline = System.currentTimeMillis() + 10_000;
        while (System.currentTimeMillis() < deadline) {
            List<Mail> mails = mailsTo(email);
            if (mails.size() >= count) {
                return mails.get(count - 1);
            }
            pause();
        }
        throw new AssertionError("Expected " + count + " mails to " + email + " but got " + mailsTo(email).size());
    }

    private List<Mail> mailsTo(String email) {
        List<Mail> mails = new ArrayList<>();
        for (Invocation invocation : List.copyOf(Mockito.mockingDetails(mailSender).getInvocations())) {
            if (invocation.getArguments().length == 1
                    && invocation.getArgument(0) instanceof MimeMessagePreparator preparator) {
                try {
                    MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
                    preparator.prepare(message);
                    Address[] to = message.getAllRecipients();
                    if (to != null && to.length == 1 && to[0].toString().equals(email)) {
                        mails.add(new Mail(message.getFrom()[0].toString(), message.getSubject(), text(message)));
                    }
                } catch (Exception e) {
                    throw new IllegalStateException(e);
                }
            }
        }
        return mails;
    }

    // Junta el texto plano y el HTML: los dos llevan el link.
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
        try {
            Thread.sleep(200);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void waitNextSecond() {
        try {
            Thread.sleep(1100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
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
