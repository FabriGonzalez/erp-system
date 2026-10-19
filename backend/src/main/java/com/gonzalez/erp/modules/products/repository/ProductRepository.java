package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.Product;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // La respuesta usa el nombre de la categoría: se trae en la misma consulta, no una por producto.
    @EntityGraph(attributePaths = "category")
    List<Product> findByCompanyId(Long companyId);

    @EntityGraph(attributePaths = "category")
    List<Product> findByCompanyIdAndActive(Long companyId, boolean active);

    Optional<Product> findByIdAndCompanyId(Long id, Long companyId);
}