package com.gonzalez.erp.modules.users.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.roles.entity.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    /** Rol dentro de la empresa. Null solo para administradores de plataforma. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private Role role;

    /** Null solo para administradores de plataforma. */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "company_id")
    private Company company;

    /**
     * Administrador global de la plataforma (provisiona y gestiona empresas).
     * No pertenece a ninguna empresa ni tiene rol de empresa, así que no es asignable
     * ni visible desde los endpoints de los tenants.
     */
    @Column(name = "platform_admin", nullable = false)
    @Builder.Default
    private boolean platformAdmin = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Cuenta creada por un administrador de la empresa: solo él define la contraseña y el
     * usuario no puede cambiarla. El default de la columna deja como estaban las cuentas previas.
     */
    @Column(name = "password_managed_by_admin", nullable = false,
            columnDefinition = "boolean not null default false")
    @Builder.Default
    private boolean passwordManagedByAdmin = false;

    /** Los JWT emitidos antes de este instante dejan de ser válidos. */
    @Column(name = "password_changed_at")
    private Instant passwordChangedAt;

    public void update(String username, String email, String firstName, String lastName, Role role) {
        this.username = username;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
    }

    /** Recibe la contraseña ya codificada e invalida las sesiones abiertas. */
    public void updatePassword(String encodedPassword) {
        this.password = encodedPassword;
        this.passwordChangedAt = Instant.now();
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
