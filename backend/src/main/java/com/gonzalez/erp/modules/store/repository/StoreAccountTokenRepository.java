package com.gonzalez.erp.modules.store.repository;

import com.gonzalez.erp.modules.store.entity.StoreAccountToken;
import com.gonzalez.erp.modules.store.entity.StoreAccountTokenType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

/** Toda búsqueda lleva la empresa: un link de la tienda A no sirve en la B. */
public interface StoreAccountTokenRepository extends JpaRepository<StoreAccountToken, Long> {

    @Query("""
            SELECT t FROM StoreAccountToken t
            JOIN FETCH t.account a
            JOIN FETCH a.customer
            WHERE t.tokenHash = :tokenHash AND t.type = :type AND a.company.id = :companyId
            """)
    Optional<StoreAccountToken> findWithAccount(@Param("companyId") Long companyId,
                                                @Param("tokenHash") String tokenHash,
                                                @Param("type") StoreAccountTokenType type);

    /** Marca como usados los links sin usar de la cuenta: solo vale el último que se pidió. */
    @Modifying
    @Query("""
            UPDATE StoreAccountToken t SET t.usedAt = :now
            WHERE t.account.id = :accountId AND t.type = :type AND t.usedAt IS NULL
            """)
    void invalidatePending(@Param("accountId") Long accountId,
                           @Param("type") StoreAccountTokenType type,
                           @Param("now") Instant now);
}
