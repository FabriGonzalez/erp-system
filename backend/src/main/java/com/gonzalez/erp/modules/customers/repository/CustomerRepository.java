package com.gonzalez.erp.modules.customers.repository;

import com.gonzalez.erp.modules.customers.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    boolean existsByCompanyIdAndDocumentTypeAndDocumentNumber(
            Long companyId,
            String documentType,
            String documentNumber
    );

    Optional<Customer> findByCompanyIdAndDocumentTypeAndDocumentNumberAndIdNot(
            Long companyId,
            String documentType,
            String documentNumber,
            Long id
    );

    @Query("""
            SELECT c FROM Customer c
            WHERE c.company.id = :companyId
              AND (:active IS NULL OR c.active = :active)
              AND (
                   LOWER(COALESCE(c.firstName, '')) LIKE CONCAT('%', LOWER(:search), '%')
                   OR LOWER(COALESCE(c.lastName, '')) LIKE CONCAT('%', LOWER(:search), '%')
                   OR LOWER(COALESCE(c.phone, '')) LIKE CONCAT('%', LOWER(:search), '%')
                   OR LOWER(COALESCE(c.documentNumber, '')) LIKE CONCAT('%', LOWER(:search), '%')
              )
            """)
    List<Customer> searchWithText(
            @Param("companyId") Long companyId,
            @Param("active") Boolean active,
            @Param("search") String search
    );

    @Query("""
            SELECT c FROM Customer c
            WHERE c.company.id = :companyId
              AND (:active IS NULL OR c.active = :active)
            """)
    List<Customer> searchWithoutText(
            @Param("companyId") Long companyId,
            @Param("active") Boolean active
    );

    Optional<Customer> findByIdAndCompanyId(Long id, Long companyId);
}
