package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.ProductAttribute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductAttributeRepository extends JpaRepository<ProductAttribute, Long> {

    List<ProductAttribute> findByCompanyId(Long companyId);

    List<ProductAttribute> findByCompanyIdAndActive(Long companyId, boolean active);

    Optional<ProductAttribute> findByIdAndCompanyId(Long id, Long companyId);

    boolean existsByNameAndCompanyId(String name, Long companyId);

    boolean existsByNameAndCompanyIdAndIdNot(String name, Long companyId, Long id);
}
