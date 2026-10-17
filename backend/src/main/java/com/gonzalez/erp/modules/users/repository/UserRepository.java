package com.gonzalez.erp.modules.users.repository;

import com.gonzalez.erp.modules.users.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {
            "role",
            "role.permissions",
            "company"
    })
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    List<User> findByActive(boolean active);

    List<User> findByRoleId(Long roleId);

    List<User> findByCompanyId(Long companyId);

    List<User> findByCompanyIdAndActive(Long companyId, boolean active);

    // Usuario y email son únicos en toda la plataforma: no se filtra por empresa.
    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByUsernameAndIdNot(String username, Long id);
}