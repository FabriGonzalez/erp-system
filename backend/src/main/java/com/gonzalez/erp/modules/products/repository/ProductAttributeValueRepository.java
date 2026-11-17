package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductAttributeValueRepository extends JpaRepository<ProductAttributeValue, Long> {

    List<ProductAttributeValue> findByAttributeId(Long attributeId);

    /** Valores de todos los atributos de la empresa, con su atributo (la respuesta usa el nombre). */
    @Query("""
            SELECT v FROM ProductAttributeValue v
            JOIN FETCH v.attribute a
            WHERE a.company.id = :companyId
            AND (:active IS NULL OR v.active = :active)
            ORDER BY a.name ASC, v.value ASC
            """)
    List<ProductAttributeValue> findAllByCompanyIdWithAttribute(
            @Param("companyId") Long companyId,
            @Param("active") Boolean active
    );

    Optional<ProductAttributeValue> findByIdAndAttributeCompanyId(Long id, Long companyId);

    boolean existsByAttributeIdAndValue(Long attributeId, String value);

    boolean existsByAttributeIdAndValueAndIdNot(Long attributeId, String value, Long id);
}
