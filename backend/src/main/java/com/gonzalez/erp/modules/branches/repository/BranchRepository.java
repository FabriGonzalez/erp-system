package com.gonzalez.erp.modules.branches.repository;

import com.gonzalez.erp.modules.branches.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    Optional<Branch> findByName(String name);
    boolean existsByName(String name);
    List<Branch> findByActive(boolean active);
}
