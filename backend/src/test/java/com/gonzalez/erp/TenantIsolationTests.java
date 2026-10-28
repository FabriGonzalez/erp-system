package com.gonzalez.erp;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
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

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * Aislamiento entre empresas contra la API real: la empresa B carga un poco de todo (sucursales,
 * catálogo, clientes, pedidos, pagos, promos, transferencias, roles y usuarios) y el admin de la
 * empresa A intenta leerlo, modificarlo o usar sus ids dentro de sus propias operaciones. Toda
 * lectura o escritura sobre datos de B tiene que responder 403 o 404, los listados de A no pueden
 * mostrar nada de B y, al final, los datos de B tienen que seguir exactamente igual.
 *
 * Cada problema se junta en una lista y se informa todo junto, así una corrida muestra todos.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin"
})
@Testcontainers(disabledWithoutDocker = true)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class TenantIsolationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

    /** Todo lo que crea B lleva esta marca: si aparece en una respuesta para A, se filtró. */
    private static final String MARK = "SECRETO-B";

    private static final TimeZone originalTimeZone = TimeZone.getDefault();

    // Mismo motivo que BackendApplicationTests: con la zona de Windows en Argentina Postgres
    // rechazaría la conexión. Va en un bloque estático porque con PER_CLASS el contexto de Spring
    // se arma antes que cualquier @BeforeAll.
    static {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    @Value("${local.server.port}")
    private int port;

    private String tokenA;
    private String tokenB;
    private final Map<String, Long> a = new LinkedHashMap<>();
    private final Map<String, Long> b = new LinkedHashMap<>();

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @BeforeAll
    void createTwoCompanies() {
        String platform = login("platform_admin", "test-platform-admin");
        tokenA = provisionAndLogin(platform, "Empresa A", "admin_a", a);
        tokenB = provisionAndLogin(platform, MARK + " Empresa", "admin_b", b);
        fill(tokenB, b, MARK + " ");
        fill(tokenA, a, "A ");
    }

    // -------------------------------------------------------------------------------------------
    // Lecturas
    // -------------------------------------------------------------------------------------------

    @Test
    void companyACannotReadAnythingFromCompanyB() {
        List<String> problems = new ArrayList<>();

        for (String path : readPathsOfB()) {
            Response response = call(tokenA, "GET", path, null);
            if (!response.denied()) {
                problems.add("GET " + path + " → " + response);
            }
        }

        assertThat(problems).as("lecturas de datos de B que A pudo hacer").isEmpty();
    }

    @Test
    void listsOfCompanyANeverShowDataFromCompanyB() {
        String from = Instant.now().minus(1, ChronoUnit.DAYS).toString();
        String to = Instant.now().plus(1, ChronoUnit.DAYS).toString();
        List<String> paths = List.of(
                "/branches", "/categories", "/customers?size=100", "/customers/debtors",
                "/inventory/stocks?size=100", "/inventory/movements?size=100",
                "/orders?size=100", "/payments?size=100", "/product-attributes",
                "/product-attributes/values", "/products?size=100", "/promotions?size=100",
                "/roles", "/inventory/transfers?size=100", "/users",
                "/reports/dashboard?from=" + from + "&to=" + to,
                // Filtrando por ids de B: vacío o denegado, nunca los datos.
                "/inventory/stocks?branchId=" + b.get("branch") + "&size=100",
                "/inventory/stocks?variantIds=" + b.get("variant") + "&size=100",
                "/inventory/movements?branchId=" + b.get("branch") + "&size=100",
                "/inventory/movements?productVariantId=" + b.get("variant") + "&size=100",
                "/inventory/movements?stockId=" + b.get("stock") + "&size=100",
                "/orders?branchId=" + b.get("branch") + "&size=100",
                "/orders?customerId=" + b.get("customer") + "&size=100",
                "/payments?customerId=" + b.get("customer") + "&size=100",
                "/reports/dashboard?from=" + from + "&to=" + to + "&branchId=" + b.get("branch"));

        List<String> problems = new ArrayList<>();
        for (String path : paths) {
            Response response = call(tokenA, "GET", path, null);
            if (response.status() >= 500 || response.body().contains(MARK)) {
                problems.add("GET " + path + " → " + response);
            }
        }

        assertThat(problems).as("listados de A que muestran datos de B").isEmpty();
    }

    @Test
    void productExportOfCompanyAOnlyHasItsOwnProducts() throws Exception {
        HttpResponse<byte[]> response = http.send(
                request(tokenA, "GET", "/imports/products/export", null).build(),
                HttpResponse.BodyHandlers.ofByteArray());

        assertThat(response.statusCode()).isEqualTo(200);
        StringBuilder text = new StringBuilder();
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(response.body()))) {
            for (Sheet sheet : workbook) {
                for (Row row : sheet) {
                    for (Cell cell : row) {
                        text.append(cell).append('|');
                    }
                }
            }
        }
        assertThat(text.toString()).contains("A Producto").doesNotContain(MARK);
    }

    // -------------------------------------------------------------------------------------------
    // Escrituras
    // -------------------------------------------------------------------------------------------

    @Test
    void companyACannotChangeOrUseDataFromCompanyB() {
        Map<String, String> before = snapshotOfB();

        List<String> problems = new ArrayList<>();
        for (Attack attack : attacks()) {
            Response response = call(tokenA, attack.method(), attack.path(), attack.body());
            if (!response.denied() && !response.hasCode(attack.rejectedWith())) {
                problems.add(attack.description() + ": " + attack.method() + " " + attack.path()
                        + " → " + response);
            }
        }

        Map<String, String> after = snapshotOfB();
        before.forEach((path, body) -> {
            if (!body.equals(after.get(path))) {
                problems.add("Cambió lo que ve B en " + path + "\n  antes:   " + body
                        + "\n  después: " + after.get(path));
            }
        });

        assertThat(problems).as("operaciones de A sobre datos de B").isEmpty();
    }

    private List<Attack> attacks() {
        Long branchA = a.get("branch");
        Long branchA2 = a.get("branch2");
        Long variantA = a.get("variant");
        String tomorrow = LocalDate.now().plusDays(1).toString();
        String nextMonth = LocalDate.now().plusDays(30).toString();
        Map<String, Object> address = Map.of(
                "street", "HACK", "number", "1", "city", "HACK", "country", "AR");

        return List.of(
                // Sucursales
                new Attack("renombrar sucursal de B", "PATCH", "/branches/" + b.get("branch"),
                        Map.of("name", "HACK")),
                new Attack("desactivar sucursal de B", "PATCH",
                        "/branches/" + b.get("branch") + "/deactivate", null),
                // Categorías
                new Attack("renombrar categoría de B", "PATCH", "/categories/" + b.get("category"),
                        Map.of("name", "HACK")),
                new Attack("desactivar categoría de B", "PATCH",
                        "/categories/" + b.get("category") + "/deactivate", null),
                // Clientes y direcciones
                new Attack("editar cliente de B", "PATCH", "/customers/" + b.get("customer"),
                        Map.of("firstName", "HACK")),
                new Attack("desactivar cliente de B", "PATCH",
                        "/customers/" + b.get("customer") + "/deactivate", null),
                new Attack("agregar dirección a cliente de B", "POST",
                        "/customers/" + b.get("customer") + "/addresses", address),
                new Attack("editar dirección de B", "PATCH",
                        "/customers/" + b.get("customer") + "/addresses/" + b.get("address"), address),
                new Attack("desactivar dirección de B", "PATCH",
                        "/customers/" + b.get("customer") + "/addresses/" + b.get("address") + "/deactivate",
                        null),
                // Stock
                new Attack("ajustar stock de B", "PATCH", "/inventory/stocks/adjust",
                        Map.of("productVariantId", b.get("variant"), "branchId", b.get("branch"),
                                "newQuantity", 999, "reason", "HACK")),
                new Attack("ajustar variante de B en sucursal de A", "PATCH", "/inventory/stocks/adjust",
                        Map.of("productVariantId", b.get("variant"), "branchId", branchA,
                                "newQuantity", 999, "reason", "HACK")),
                new Attack("ajustar variante de A en sucursal de B", "PATCH", "/inventory/stocks/adjust",
                        Map.of("productVariantId", variantA, "branchId", b.get("branch"),
                                "newQuantity", 999, "reason", "HACK")),
                // Pedidos
                new Attack("vender variante de B", "POST", "/orders",
                        walkInOrder(branchA, b.get("variant"))),
                new Attack("vender en sucursal de B", "POST", "/orders",
                        walkInOrder(b.get("branch"), variantA)),
                new Attack("venderle a cliente de B", "POST", "/orders",
                        Map.of("branchId", branchA, "customerId", b.get("customer"),
                                "salesType", "WITH_PRODUCTS", "deliveryType", "LOCAL_PICKUP",
                                "items", List.of(Map.of("productVariantId", variantA, "quantity", 1)))),
                // Se busca la dirección dentro del cliente del pedido: la respuesta es la misma que
                // con un id que no existe.
                new Attack("enviar a dirección de B", "POST", "/orders",
                        Map.of("branchId", branchA, "customerId", a.get("customer"),
                                "salesType", "WITH_PRODUCTS", "deliveryType", "SHIPPING",
                                "shippingAddressId", b.get("address"),
                                "items", List.of(Map.of("productVariantId", variantA, "quantity", 1))),
                        "INVALID_SHIPPING_ADDRESS"),
                new Attack("vender promo de B", "POST", "/orders",
                        Map.of("branchId", branchA, "salesType", "WITH_PRODUCTS",
                                "deliveryType", "LOCAL_PICKUP", "paymentMethod", "CASH",
                                "promos", List.of(Map.of("promotionId", b.get("promotion"), "quantity", 1,
                                        "variants", List.of(Map.of("productVariantId", variantA,
                                                "quantity", 2)))))),
                new Attack("editar pedido de B", "PATCH", "/orders/" + b.get("order"),
                        Map.of("items", List.of(Map.of("productVariantId", variantA, "quantity", 1)))),
                new Attack("despachar pedido de B", "POST", "/orders/" + b.get("order") + "/dispatch", null),
                new Attack("cancelar pedido de B", "POST", "/orders/" + b.get("order") + "/cancel",
                        Map.of("refundAction", "KEEP_AS_CREDIT")),
                new Attack("crear envío en pedido de B", "POST", "/orders/" + b.get("order") + "/shipment",
                        address),
                new Attack("editar envío de pedido de B", "PATCH",
                        "/orders/" + b.get("order") + "/shipment", address),
                // Pagos
                new Attack("cobrarle a cliente de B", "POST", "/payments",
                        Map.of("customerId", b.get("customer"), "branchId", branchA,
                                "amount", 100, "method", "CASH")),
                new Attack("cobrar en sucursal de B", "POST", "/payments",
                        Map.of("customerId", a.get("customer"), "branchId", b.get("branch"),
                                "amount", 100, "method", "CASH")),
                new Attack("anular pago de B", "PATCH", "/payments/" + b.get("payment") + "/cancel", null),
                // Productos
                new Attack("producto con categoría de B", "POST", "/products",
                        Map.of("name", "HACK 1", "categoryId", b.get("category"),
                                "variants", List.of(Map.of("price", 10)))),
                new Attack("producto con valor de atributo de B", "POST", "/products",
                        Map.of("name", "HACK 2", "categoryId", a.get("category"),
                                "variants", List.of(Map.of("price", 10,
                                        "attributeValueIds", List.of(b.get("value")))))),
                new Attack("producto con stock inicial en sucursal de B", "POST", "/products",
                        Map.of("name", "HACK 3", "categoryId", a.get("category"),
                                "variants", List.of(Map.of("price", 10, "initialStock",
                                        List.of(Map.of("branchId", b.get("branch"), "quantity", 5)))))),
                new Attack("editar producto de B", "PATCH", "/products/" + b.get("product"),
                        Map.of("name", "HACK", "categoryId", b.get("category"),
                                "variants", List.of(Map.of("price", 1000,
                                        "attributeValueIds", List.of(b.get("value")))))),
                new Attack("mover producto de A a categoría de B", "PATCH", "/products/" + a.get("product"),
                        productUpdateOfA(b.get("category"), List.of())),
                new Attack("stock de producto de A en sucursal de B", "PATCH", "/products/" + a.get("product"),
                        productUpdateOfA(a.get("category"),
                                List.of(Map.of("branchId", b.get("branch"), "quantity", 5)))),
                new Attack("desactivar producto de B", "PATCH",
                        "/products/" + b.get("product") + "/deactivate", null),
                // Atributos
                new Attack("renombrar atributo de B", "PATCH", "/product-attributes/" + b.get("attribute"),
                        Map.of("name", "HACK")),
                new Attack("desactivar atributo de B", "PATCH",
                        "/product-attributes/" + b.get("attribute") + "/deactivate", null),
                new Attack("agregar valor a atributo de B", "POST",
                        "/product-attributes/" + b.get("attribute") + "/values", Map.of("value", "HACK")),
                new Attack("editar valor de B", "PATCH", "/product-attributes/values/" + b.get("value"),
                        Map.of("value", "HACK")),
                new Attack("desactivar valor de B", "PATCH",
                        "/product-attributes/values/" + b.get("value") + "/deactivate", null),
                // Promos
                new Attack("promo con producto de B", "POST", "/promotions",
                        Map.of("name", "HACK", "price", 10, "startDate", tomorrow, "endDate", nextMonth,
                                "items", List.of(Map.of("productId", b.get("product"), "quantity", 2)))),
                new Attack("editar promo de B", "PATCH", "/promotions/" + b.get("promotion"),
                        Map.of("name", "HACK", "price", 10, "startDate", tomorrow, "endDate", nextMonth,
                                "items", List.of(Map.of("productId", a.get("product"), "quantity", 2)))),
                new Attack("desactivar promo de B", "PATCH",
                        "/promotions/" + b.get("promotion") + "/deactivate", null),
                // Roles y usuarios
                new Attack("editar rol de B", "PATCH", "/roles/" + b.get("role"),
                        Map.of("name", "HACK", "code", "HACK", "permissions", List.of("CREAR_PEDIDOS"))),
                new Attack("desactivar rol de B", "PATCH", "/roles/" + b.get("role") + "/deactivate", null),
                new Attack("crear usuario con rol de B", "POST", "/users",
                        Map.of("username", "hack_user", "password", "Password123", "email", "hack@x.com",
                                "firstName", "Hack", "lastName", "Hack", "roleId", b.get("role"))),
                new Attack("darle a un usuario de A el rol de B", "PATCH", "/users/" + a.get("user"),
                        Map.of("username", "a_user", "email", "a_user@x.com", "firstName", "A",
                                "lastName", "Usuario", "roleId", b.get("role"))),
                new Attack("editar usuario de B", "PATCH", "/users/" + b.get("user"),
                        Map.of("username", "hacked", "email", "hacked@x.com", "firstName", "Hack",
                                "lastName", "Hack", "roleId", a.get("role"))),
                new Attack("desactivar usuario de B", "PATCH", "/users/" + b.get("user") + "/deactivate", null),
                new Attack("resetear contraseña de usuario de B", "POST",
                        "/users/" + b.get("user") + "/password-reset", Map.of("newPassword", "hacked123")),
                new Attack("asignar usuario de B a sucursal de A", "POST",
                        "/users/" + b.get("user") + "/branches/" + branchA, null),
                new Attack("asignar usuario de A a sucursal de B", "POST",
                        "/users/" + a.get("user") + "/branches/" + b.get("branch"), null),
                new Attack("quitar al admin de B de su sucursal", "DELETE",
                        "/users/" + b.get("admin") + "/branches/" + b.get("branch"), null),
                // Transferencias
                new Attack("transferir a sucursal de B", "POST", "/inventory/transfers",
                        transfer(branchA, b.get("branch"), variantA)),
                new Attack("transferir desde sucursal de B", "POST", "/inventory/transfers",
                        transfer(b.get("branch"), branchA, b.get("variant"))),
                new Attack("transferir variante de B entre sucursales de A", "POST", "/inventory/transfers",
                        transfer(branchA, branchA2, b.get("variant"))),
                new Attack("anular transferencia de B", "PATCH",
                        "/inventory/transfers/" + b.get("transfer") + "/cancel", null),
                // Plataforma
                new Attack("suspender a la empresa B", "PATCH",
                        "/provisioning/companies/" + b.get("company") + "/status",
                        Map.of("status", "SUSPENDED", "reason", "HACK")));
    }

    // -------------------------------------------------------------------------------------------
    // Datos de prueba
    // -------------------------------------------------------------------------------------------

    /** Lo que B ve de sus propios datos; se compara antes y después de los intentos de A. */
    private Map<String, String> snapshotOfB() {
        Map<String, String> snapshot = new LinkedHashMap<>();
        for (String path : readPathsOfB()) {
            Response response = call(tokenB, "GET", path, null);
            assertThat(response.status()).as("B lee " + path).isBetween(200, 299);
            snapshot.put(path, response.body());
        }
        for (String path : List.of("/branches", "/customers?size=100", "/inventory/stocks?size=100",
                "/inventory/movements?size=100", "/orders?size=100", "/payments?size=100",
                "/products?size=100", "/promotions?size=100", "/users", "/roles",
                "/inventory/transfers?size=100", "/product-attributes/values")) {
            snapshot.put(path, call(tokenB, "GET", path, null).body());
        }
        return snapshot;
    }

    private List<String> readPathsOfB() {
        Long customer = b.get("customer");
        return List.of(
                "/branches/" + b.get("branch"),
                "/branches/" + b.get("branch") + "/users",
                "/categories/" + b.get("category"),
                "/customers/" + customer,
                "/customers/" + customer + "/account",
                "/customers/" + customer + "/account/pending-orders",
                "/customers/" + customer + "/account/transactions",
                "/customers/" + customer + "/addresses",
                "/customers/" + customer + "/addresses/" + b.get("address"),
                "/inventory/stocks/" + b.get("stock"),
                "/inventory/stocks/variant/" + b.get("variant"),
                "/inventory/stocks/branch/" + b.get("branch"),
                "/inventory/movements/" + b.get("movement"),
                "/orders/" + b.get("order"),
                "/orders/" + b.get("shippingOrder") + "/shipment",
                "/payments/" + b.get("payment"),
                "/product-attributes/" + b.get("attribute"),
                "/product-attributes/" + b.get("attribute") + "/values",
                "/products/" + b.get("product"),
                "/promotions/" + b.get("promotion"),
                "/roles/" + b.get("role"),
                "/inventory/transfers/" + b.get("transfer"),
                "/users/" + b.get("user"),
                "/users/" + b.get("user") + "/branches");
    }

    private String provisionAndLogin(String platformToken, String companyName, String admin,
                                     Map<String, Long> ids) {
        JsonNode created = ok(call(platformToken, "POST", "/provisioning/companies", Map.of(
                "companyName", companyName,
                "adminUsername", admin,
                "adminEmail", admin + "@x.com",
                "adminFirstName", "Admin",
                "adminLastName", companyName)));
        ids.put("company", created.get("companyId").asLong());
        ids.put("admin", created.get("adminUserId").asLong());
        return login(admin, created.get("temporaryPassword").asString());
    }

    /** Un poco de cada módulo, con nombres que empiezan con {@code name}. */
    private void fill(String token, Map<String, Long> ids, String name) {
        ids.put("branch", id(call(token, "POST", "/branches", Map.of("name", name + "Sucursal 1"))));
        ids.put("branch2", id(call(token, "POST", "/branches", Map.of("name", name + "Sucursal 2"))));
        ids.put("category", id(call(token, "POST", "/categories", Map.of("name", name + "Categoría"))));
        ids.put("attribute", id(call(token, "POST", "/product-attributes", Map.of("name", name + "Talle"))));
        ids.put("value", id(call(token, "POST", "/product-attributes/" + ids.get("attribute") + "/values",
                Map.of("value", name + "XL"))));

        JsonNode product = ok(call(token, "POST", "/products", Map.of(
                "name", name + "Producto",
                "categoryId", ids.get("category"),
                "variants", List.of(Map.of(
                        "price", 1000,
                        "attributeValueIds", List.of(ids.get("value")),
                        "initialStock", List.of(Map.of("branchId", ids.get("branch"), "quantity", 10)))))));
        ids.put("product", product.get("id").asLong());
        ids.put("variant", product.get("variants").get(0).get("id").asLong());

        ids.put("customer", id(call(token, "POST", "/customers", Map.of(
                "firstName", name + "Cliente",
                "addresses", List.of(Map.of("street", name + "Calle", "number", "1", "city", "Ciudad",
                        "country", "AR", "mainAddress", true))))));
        ids.put("address", ok(call(token, "GET", "/customers/" + ids.get("customer") + "/addresses", null))
                .get(0).get("id").asLong());

        // A cuenta corriente: deja deuda para poder registrar un pago.
        ids.put("order", id(call(token, "POST", "/orders", Map.of(
                "branchId", ids.get("branch"),
                "customerId", ids.get("customer"),
                "salesType", "WITH_PRODUCTS",
                "deliveryType", "LOCAL_PICKUP",
                "items", List.of(Map.of("productVariantId", ids.get("variant"), "quantity", 1))))));
        ids.put("shippingOrder", id(call(token, "POST", "/orders", Map.of(
                "branchId", ids.get("branch"),
                "customerId", ids.get("customer"),
                "salesType", "WITH_PRODUCTS",
                "deliveryType", "SHIPPING",
                "shippingAddressId", ids.get("address"),
                "items", List.of(Map.of("productVariantId", ids.get("variant"), "quantity", 1))))));
        ids.put("payment", id(call(token, "POST", "/payments", Map.of(
                "customerId", ids.get("customer"), "branchId", ids.get("branch"),
                "amount", 500, "method", "CASH"))));

        ids.put("promotion", id(call(token, "POST", "/promotions", Map.of(
                "name", name + "Promo",
                "price", 1500,
                "startDate", LocalDate.now().minusDays(1).toString(),
                "endDate", LocalDate.now().plusDays(30).toString(),
                "items", List.of(Map.of("productId", ids.get("product"), "quantity", 2))))));
        ids.put("transfer", id(call(token, "POST", "/inventory/transfers",
                transfer(ids.get("branch"), ids.get("branch2"), ids.get("variant")))));

        ids.put("role", id(call(token, "POST", "/roles", Map.of(
                "name", name + "Rol",
                "code", name.trim().replace('-', '_') + "_ROL",
                "permissions", List.of("CREAR_PEDIDOS")))));
        String username = name.trim().toLowerCase().replace('-', '_') + "_user";
        ids.put("user", id(call(token, "POST", "/users", Map.of(
                "username", username, "password", "Password123", "email", username + "@x.com",
                "firstName", name + "Usuario", "lastName", "Usuario", "roleId", ids.get("role")))));
        ok(call(token, "POST", "/users/" + ids.get("user") + "/branches/" + ids.get("branch"), null));

        ids.put("stock", ok(call(token, "GET", "/inventory/stocks/variant/" + ids.get("variant"), null))
                .get(0).get("id").asLong());
        ids.put("movement", ok(call(token, "GET", "/inventory/movements?size=1", null))
                .get("content").get(0).get("id").asLong());
    }

    private Map<String, Object> productUpdateOfA(Long categoryId, List<Map<String, Object>> stock) {
        Map<String, Object> variant = new LinkedHashMap<>();
        variant.put("price", 1000);
        variant.put("attributeValueIds", List.of(a.get("value")));
        variant.put("stock", stock);
        return Map.of("name", "A Producto", "categoryId", categoryId, "variants", List.of(variant));
    }

    private static Map<String, Object> walkInOrder(Long branchId, Long variantId) {
        return Map.of("branchId", branchId, "salesType", "WITH_PRODUCTS", "deliveryType", "LOCAL_PICKUP",
                "paymentMethod", "CASH",
                "items", List.of(Map.of("productVariantId", variantId, "quantity", 1)));
    }

    private static Map<String, Object> transfer(Long origin, Long destination, Long variantId) {
        return Map.of("originBranchId", origin, "destinationBranchId", destination,
                "items", List.of(Map.of("productVariantId", variantId, "quantity", 1)));
    }

    // -------------------------------------------------------------------------------------------
    // HTTP
    // -------------------------------------------------------------------------------------------

    /** {@code rejectedWith}: código de error que también cuenta como rechazo, además de 403 y 404. */
    private record Attack(String description, String method, String path, Object body, String rejectedWith) {
        Attack(String description, String method, String path, Object body) {
            this(description, method, path, body, null);
        }
    }

    private record Response(int status, String body) {
        /** Denegado = 403 o 404; cualquier otra cosa (incluido un 400 o 409) se revisa a mano. */
        boolean denied() {
            return status == 403 || status == 404;
        }

        boolean hasCode(String code) {
            return code != null && status >= 400 && status < 500 && body.contains("\"code\":\"" + code + "\"");
        }

        @Override
        public String toString() {
            return status + " " + (body.length() > 300 ? body.substring(0, 300) + "…" : body);
        }
    }

    private String login(String username, String password) {
        return ok(call(null, "POST", "/auth/login",
                Map.of("username", username, "password", password))).get("token").asString();
    }

    private Long id(Response response) {
        return ok(response).get("id").asLong();
    }

    private JsonNode ok(Response response) {
        assertThat(response.status()).as(response.toString()).isBetween(200, 299);
        return response.body().isEmpty() ? json.createObjectNode() : json.readTree(response.body());
    }

    private Response call(String token, String method, String path, Object body) {
        try {
            HttpResponse<String> response = http.send(request(token, method, path, body).build(),
                    HttpResponse.BodyHandlers.ofString());
            return new Response(response.statusCode(), response.body());
        } catch (Exception e) {
            throw new IllegalStateException(method + " " + path, e);
        }
    }

    private HttpRequest.Builder request(String token, String method, String path, Object body) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path))
                .header("Content-Type", "application/json")
                .method(method, body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return builder;
    }
}
