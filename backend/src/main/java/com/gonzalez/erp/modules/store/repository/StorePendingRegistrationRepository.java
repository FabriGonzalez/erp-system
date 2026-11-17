package com.gonzalez.erp.modules.store.repository;

import com.gonzalez.erp.modules.store.entity.StorePendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Toda búsqueda lleva la empresa: un link de la tienda A no sirve en la B. */
public interface StorePendingRegistrationRepository extends JpaRepository<StorePendingRegistration, Long> {

    Optional<StorePendingRegistration> findByCompanyIdAndTokenHash(Long companyId, String tokenHash);

    // Los más nuevos primero. Se limita para que el login no compare contra una lista sin fin.
    List<StorePendingRegistration> findTop5ByCompanyIdAndEmailOrderByCreatedAtDesc(Long companyId, String email);

    @Modifying
    @Query("DELETE FROM StorePendingRegistration p WHERE p.company.id = :companyId AND p.email = :email")
    void deleteAllByEmail(@Param("companyId") Long companyId, @Param("email") String email);

    @Modifying
    @Query("""
            DELETE FROM StorePendingRegistration p
            WHERE p.company.id = :companyId AND p.email = :email AND p.expiresAt <= :now
            """)
    void deleteExpiredByEmail(@Param("companyId") Long companyId, @Param("email") String email,
                              @Param("now") Instant now);
}
