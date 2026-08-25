package com.gonzalez.erp.modules.companies.repository;

import com.gonzalez.erp.modules.companies.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findByName(String name);
    boolean existsByName(String name);
    Optional<Company> findByTaxId(String taxId);
    boolean existsByTaxId(String taxId);
}
