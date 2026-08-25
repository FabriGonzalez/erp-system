package com.gonzalez.erp.modules.categories.repository;

import com.gonzalez.erp.modules.categories.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByNameAndCompanyId(String name, Long companyId);
    boolean existsByNameAndCompanyId(String name, Long companyId);
    List<Category> findByCompanyId(Long companyId);
    List<Category> findByCompanyIdAndActive(Long companyId, boolean active);
    Optional<Category> findByIdAndCompanyId(Long id, Long companyId);
}
