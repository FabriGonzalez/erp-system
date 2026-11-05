package com.gonzalez.erp.modules.store.repository;

import com.gonzalez.erp.modules.store.entity.StoreAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/** Toda búsqueda lleva la empresa: una cuenta solo existe dentro de su tienda. */
public interface StoreAccountRepository extends JpaRepository<StoreAccount, Long> {

    boolean existsByCompanyIdAndEmail(Long companyId, String email);

    @Query("""
            SELECT a FROM StoreAccount a JOIN FETCH a.customer
            WHERE a.company.id = :companyId AND a.email = :email
            """)
    Optional<StoreAccount> findWithCustomerByEmail(@Param("companyId") Long companyId, @Param("email") String email);

    // Con el cliente cargado: el filtro corre fuera de una transacción y mira si está activo.
    @Query("""
            SELECT a FROM StoreAccount a JOIN FETCH a.customer
            WHERE a.id = :id AND a.company.id = :companyId
            """)
    Optional<StoreAccount> findWithCustomer(@Param("id") Long id, @Param("companyId") Long companyId);
}
