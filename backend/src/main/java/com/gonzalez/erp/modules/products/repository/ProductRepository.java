package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCompanyId(Long companyId);

    List<Product> findByCompanyIdAndActive(Long companyId, boolean active);

    Optional<Product> findByIdAndCompanyId(Long id, Long companyId);
}