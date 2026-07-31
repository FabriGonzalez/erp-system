package com.gonzalez.erp.modules.users.service;

import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;
import com.gonzalez.erp.modules.users.dto.response.UserResponse;

import java.util.List;

public interface UserBranchService {
    List<BranchResponse> findBranchesByUserId(Long userId);
    List<UserResponse> findUsersByBranchId(Long branchId);
    void assignUserToBranch(Long userId, Long branchId);
    void removeUserFromBranch(Long userId, Long branchId);
}
