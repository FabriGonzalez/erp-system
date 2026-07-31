package com.gonzalez.erp.modules.users.repository;

import com.gonzalez.erp.modules.users.entity.UserBranch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserBranchRepository extends JpaRepository<UserBranch, Long> {
    List<UserBranch> findByUserId(Long userId);
    List<UserBranch> findByBranchId(Long branchId);
    Optional<UserBranch> findByUserIdAndBranchId(Long userId, Long branchId);
    boolean existsByUserIdAndBranchId(Long userId, Long branchId);
    void deleteByUserIdAndBranchId(Long userId, Long branchId);
}
