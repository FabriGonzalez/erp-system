package com.gonzalez.erp.modules.products.repository;

import com.gonzalez.erp.modules.products.entity.ProductAttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductAttributeValueRepository extends JpaRepository<ProductAttributeValue, Long> {

    List<ProductAttributeValue> findByAttributeId(Long attributeId);

    Optional<ProductAttributeValue> findByIdAndAttributeCompanyId(Long id, Long companyId);

    boolean existsByAttributeIdAndValue(Long attributeId, String value);

    boolean existsByAttributeIdAndValueAndIdNot(Long attributeId, String value, Long id);
}
