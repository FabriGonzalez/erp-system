package com.gonzalez.erp.modules.roles.repository;

import com.gonzalez.erp.modules.roles.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByIdAndCompanyId(Long id, Long companyId);
    List<Role> findByCompanyId(Long companyId);
    List<Role> findByCompanyIdAndActive(Long companyId, boolean active);
    boolean existsByNameAndCompanyId(String name, Long companyId);
    boolean existsByCodeAndCompanyId(String code, Long companyId);
    boolean existsByNameAndCompanyIdAndIdNot(String name, Long companyId, Long id);
    boolean existsByCodeAndCompanyIdAndIdNot(String code, Long companyId, Long id);
}
