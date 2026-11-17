package com.gonzalez.erp.modules.promotions.repository;

import com.gonzalez.erp.modules.promotions.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    Optional<Promotion> findByIdAndCompanyId(Long id, Long companyId);

    /**
     * Listado paginado. :search (nombre) llega como en SearchText; los only* filtran por el
     * estado calculado contra :today (ver Promotion.statusOn), como mucho uno en true.
     */
    @Query(value = """
            SELECT p FROM Promotion p
            WHERE p.company.id = :companyId
            AND (:hasSearch = false
                 OR CAST(FUNCTION('translate', LOWER(p.name),
                         'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE :search)
            AND (:onlyActive = false OR (p.active = true AND p.startDate <= :today AND p.endDate >= :today))
            AND (:onlyScheduled = false OR (p.active = true AND p.startDate > :today))
            AND (:onlyExpired = false OR (p.active = true AND p.endDate < :today))
            AND (:onlyInactive = false OR p.active = false)
            """,
            countQuery = """
            SELECT COUNT(p) FROM Promotion p
            WHERE p.company.id = :companyId
            AND (:hasSearch = false
                 OR CAST(FUNCTION('translate', LOWER(p.name),
                         'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc') AS String) LIKE :search)
            AND (:onlyActive = false OR (p.active = true AND p.startDate <= :today AND p.endDate >= :today))
            AND (:onlyScheduled = false OR (p.active = true AND p.startDate > :today))
            AND (:onlyExpired = false OR (p.active = true AND p.endDate < :today))
            AND (:onlyInactive = false OR p.active = false)
            """)
    Page<Promotion> search(
            @Param("companyId") Long companyId,
            @Param("hasSearch") boolean hasSearch,
            @Param("search") String search,
            @Param("today") LocalDate today,
            @Param("onlyActive") boolean onlyActive,
            @Param("onlyScheduled") boolean onlyScheduled,
            @Param("onlyExpired") boolean onlyExpired,
            @Param("onlyInactive") boolean onlyInactive,
            Pageable pageable
    );
}
