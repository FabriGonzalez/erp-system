package com.gonzalez.erp.modules.roles.repository;

import com.gonzalez.erp.modules.roles.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
    boolean existsByName(String name);
    Optional<Role> findByCode(String code);
    boolean existsByCode(String code);
    List<Role> findByActive(boolean active);
}
