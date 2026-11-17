package com.gonzalez.erp.modules.users.repository;

import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.users.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    // Usuario y email se comparan sin distinguir mayúsculas: "Juan" y "juan" son el mismo para el
    // login, así que tampoco pueden existir los dos (índices únicos sobre lower() en V2).
    boolean existsByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = {
            "role",
            "role.permissions",
            "company"
    })
    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCase(String username);

    List<User> findByActive(boolean active);

    List<User> findByRoleId(Long roleId);

    List<User> findByCompanyId(Long companyId);

    List<User> findByCompanyIdAndActive(Long companyId, boolean active);

    @Query("""
            SELECT u FROM User u
            JOIN u.role r
            JOIN r.permissions p
            WHERE u.company.id = :companyId AND p = :permission
            """)
    List<User> findByCompanyIdAndRolePermission(
            @Param("companyId") Long companyId,
            @Param("permission") Permission permission);

    // Usuario y email son únicos en toda la plataforma: no se filtra por empresa.
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByUsernameIgnoreCaseAndIdNot(String username, Long id);
}