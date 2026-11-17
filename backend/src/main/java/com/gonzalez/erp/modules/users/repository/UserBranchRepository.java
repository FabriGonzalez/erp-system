package com.gonzalez.erp.modules.users.repository;

import com.gonzalez.erp.modules.users.entity.UserBranch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserBranchRepository extends JpaRepository<UserBranch, Long> {
    List<UserBranch> findByUserId(Long userId);

    /** Ids de las sucursales asignadas al usuario, de la empresa y activas. */
    @Query("""
            SELECT b.id FROM UserBranch ub
            JOIN ub.branch b
            WHERE ub.user.id = :userId
            AND b.company.id = :companyId
            AND b.active = true
            ORDER BY b.id
            """)
    List<Long> findAccessibleBranchIds(@Param("userId") Long userId, @Param("companyId") Long companyId);

    List<UserBranch> findByBranchId(Long branchId);
    Optional<UserBranch> findByUserIdAndBranchId(Long userId, Long branchId);
    boolean existsByUserIdAndBranchId(Long userId, Long branchId);
    void deleteByUserIdAndBranchId(Long userId, Long branchId);
}
