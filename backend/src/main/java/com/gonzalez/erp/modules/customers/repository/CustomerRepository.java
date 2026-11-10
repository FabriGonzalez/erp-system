package com.gonzalez.erp.modules.customers.repository;

import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.CustomerOrigin;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // El checkout de la tienda lo toma para que dos compras del mismo comprador vayan de a una.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Customer c WHERE c.id = :id AND c.company.id = :companyId")
    Optional<Customer> findByIdAndCompanyIdForUpdate(@Param("id") Long id, @Param("companyId") Long companyId);

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

    /**
     * Busca por nombre completo en ambos órdenes ("maria garcia" / "garcia maria"), teléfono,
     * email o documento, sin distinguir mayúsculas ni tildes. :search debe llegar ya en
     * minúsculas y sin tildes (CustomerServiceImpl.normalizeSearch); las columnas se
     * normalizan con translate() para no depender de la extensión unaccent. El CAST hace
     * falta porque Hibernate tipa FUNCTION() como Object y LIKE exige un string.
     */
    @Query("""
            SELECT c FROM Customer c
            WHERE c.company.id = :companyId
              AND (:active IS NULL OR c.active = :active)
              AND (:origin IS NULL OR c.origin = :origin)
              AND (
                   CAST(FUNCTION('translate', LOWER(CONCAT(COALESCE(c.firstName, ''), ' ', COALESCE(c.lastName, ''))),
                            'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE CONCAT('%', :search, '%')
                   OR CAST(FUNCTION('translate', LOWER(CONCAT(COALESCE(c.lastName, ''), ' ', COALESCE(c.firstName, ''))),
                            'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE CONCAT('%', :search, '%')
                   OR LOWER(COALESCE(c.phone, '')) LIKE CONCAT('%', :search, '%')
                   OR LOWER(COALESCE(c.email, '')) LIKE CONCAT('%', :search, '%')
                   OR LOWER(COALESCE(c.documentNumber, '')) LIKE CONCAT('%', :search, '%')
              )
            """)
    Page<Customer> searchWithText(
            @Param("companyId") Long companyId,
            @Param("active") Boolean active,
            @Param("origin") CustomerOrigin origin,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("""
            SELECT c FROM Customer c
            WHERE c.company.id = :companyId
              AND (:active IS NULL OR c.active = :active)
              AND (:origin IS NULL OR c.origin = :origin)
            """)
    Page<Customer> searchWithoutText(
            @Param("companyId") Long companyId,
            @Param("active") Boolean active,
            @Param("origin") CustomerOrigin origin,
            Pageable pageable
    );

    Optional<Customer> findByIdAndCompanyId(Long id, Long companyId);
}
