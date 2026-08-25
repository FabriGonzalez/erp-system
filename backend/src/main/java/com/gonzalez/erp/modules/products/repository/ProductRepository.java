package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, String> {

    List<Product> findByActive(boolean active);
}
