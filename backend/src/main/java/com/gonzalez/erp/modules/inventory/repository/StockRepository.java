package com.gonzalez.erp.modules.inventory.repository;

import com.gonzalez.erp.modules.inventory.entity.Stock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, Long> {

    Optional<Stock> findByProductIdAndBranchId(String productId, Long branchId);

    boolean existsByProductIdAndBranchId(String productId, Long branchId);

    List<Stock> findByBranchId(Long branchId);

    List<Stock> findByProductId(String productId);
}