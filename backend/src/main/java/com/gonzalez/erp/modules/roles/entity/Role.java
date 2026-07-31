package com.gonzalez.erp.modules.roles.entity;

import com.gonzalez.erp.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "roles")
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class Role extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(length = 200)
    private String description;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "role_permissions", joinColumns = @JoinColumn(name = "role_id"))
    @Column(name = "permission")
    @Enumerated(EnumType.STRING)
    private Set<Permission> permissions;

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
