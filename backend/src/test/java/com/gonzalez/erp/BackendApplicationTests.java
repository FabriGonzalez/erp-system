package com.gonzalez.erp;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.TimeZone;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/*
 * Levanta la aplicación entera contra un Postgres temporal en Docker: aplica las migraciones de
 * Flyway, Hibernate valida que las entidades coincidan con el esquema y Spring Data revisa cada
 * @Query. Sin Docker el test se saltea en vez de fallar.
 */
// Base vacía: al arrancar se crea el platform admin, que exige su contraseña.
@SpringBootTest(properties = {
        "app.jwt.secret=test-secret-de-al-menos-32-bytes-para-hs256-0123456789",
        "app.platform-admin.password=test-platform-admin"
})
@Testcontainers(disabledWithoutDocker = true)
class BackendApplicationTests {

    // La misma versión que docker-compose y producción.
    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17");

    private static TimeZone originalTimeZone;

    /*
     * El driver le manda a Postgres la zona de la JVM, y en Windows con hora de Argentina es
     * "America/Buenos_Aires", un alias que las imágenes nuevas de Postgres rechazan. En UTC, como
     * en producción (contenedor de Render).
     */
    @BeforeAll
    static void useUtc() {
        originalTimeZone = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    @AfterAll
    static void restoreTimeZone() {
        TimeZone.setDefault(originalTimeZone);
    }

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void contextLoads() {
    }

    /** V2: la base no deja "PLATFORM_ADMIN" si existe "platform_admin", ni lo mismo con el email. */
    @Test
    void aUsernameOrEmailThatOnlyDiffersInCaseIsRejectedByTheDatabase() {
        assertThatThrownBy(() -> copyPlatformAdmin("upper(username)", "'otro-' || email"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> copyPlatformAdmin("'otro_' || username", "upper(email)"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    /** Inserta una copia del platform admin con otro usuario y email (expresiones SQL). */
    private void copyPlatformAdmin(String username, String email) {
        jdbc.update("""
                INSERT INTO users (id, active, password_managed_by_admin, platform_admin, company_id,
                                   created_at, updated_at, username, email, first_name, last_name,
                                   password, role_id)
                SELECT id + 1000, active, password_managed_by_admin, platform_admin, company_id,
                       created_at, updated_at, %s, %s, first_name, last_name, password, role_id
                FROM users WHERE username = 'platform_admin'
                """.formatted(username, email));
    }
}
