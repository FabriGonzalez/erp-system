package com.gonzalez.erp.modules.roles.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import com.gonzalez.erp.modules.companies.entity.Company;
import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "roles", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_role_company_name",
                columnNames = {"company_id", "name"}
        ),
        @UniqueConstraint(
                name = "uk_role_company_code",
                columnNames = {"company_id", "code"}
        )
})
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class Role extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 20)
    private String code;

    @Column(length = 200)
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<Permission> permissions;

    /**
     * Roles creados por la plataforma al provisionar la empresa (ej. el ADMIN inicial).
     * No se pueden editar ni desactivar, para que la empresa no se quede sin administrador.
     */
    @Column(name = "system_role", nullable = false)
    @Builder.Default
    private boolean system = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    public void update(String name, String code, String description, Set<Permission> permissions) {
        this.name = name;
        this.code = code;
        this.description = description;
        this.permissions = permissions;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
