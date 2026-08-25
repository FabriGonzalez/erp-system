package com.gonzalez.erp.modules.branches.repository;

import com.gonzalez.erp.modules.branches.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    Optional<Branch> findByNameAndCompanyId(String name, Long companyId);
    boolean existsByNameAndCompanyId(String name, Long companyId);
    List<Branch> findByCompanyId(Long companyId);
    List<Branch> findByCompanyIdAndActive(Long companyId, boolean active);
    Optional<Branch> findByIdAndCompanyId(Long id, Long companyId);
}