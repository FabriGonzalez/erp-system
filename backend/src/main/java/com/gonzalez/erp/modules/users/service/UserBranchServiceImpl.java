package com.gonzalez.erp.modules.users.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.mapper.BranchMapper;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.users.dto.response.UserResponse;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.entity.UserBranch;
import com.gonzalez.erp.modules.users.mapper.UserMapper;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserBranchServiceImpl implements UserBranchService {

    private final UserBranchRepository userBranchRepository;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;

    @Override
    public List<BranchResponse> findBranchesByUserId(Long userId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with id: " + userId));

        validateUserBelongsToCompany(user, companyId);

        return userBranchRepository.findByUserId(userId).stream()
                .map(UserBranch::getBranch)
                .filter(branch -> branch.getCompany() != null
                        && companyId.equals(branch.getCompany().getId()))
                .map(BranchMapper::toResponse)
                .toList();
    }

    @Override
    public List<UserResponse> findUsersByBranchId(Long branchId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Branch not found with id: " + branchId));

        validateBranchBelongsToCompany(branch, companyId);

        return userBranchRepository.findByBranchId(branchId).stream()
                .map(UserBranch::getUser)
                .filter(user -> user.getCompany() != null
                        && companyId.equals(user.getCompany().getId()))
                .map(UserMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void assignUserToBranch(Long userId, Long branchId) {
        UserBranchContext context = getValidatedContext(userId, branchId);

        User user = context.user();
        Branch branch = context.branch();

        if (userBranchRepository.existsByUserIdAndBranchId(userId, branchId)) {
            return;
        }

        userBranchRepository.save(UserBranch.builder()
                .user(user)
                .branch(branch)
                .build());
    }

    @Override
    @Transactional
    public void removeUserFromBranch(Long userId, Long branchId) {
        getValidatedContext(userId, branchId);

        UserBranch userBranch = userBranchRepository.findByUserIdAndBranchId(userId, branchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User %d is not assigned to branch %d".formatted(userId, branchId)));

        userBranchRepository.delete(userBranch);
    }

    private void validateUserBelongsToCompany(User user, Long companyId) {
        if (user.getCompany() == null
                || !companyId.equals(user.getCompany().getId())) {
            throw new ResourceNotFoundException("User not found with id: " + user.getId());
        }
    }

    private void validateBranchBelongsToCompany(Branch branch, Long companyId) {
        if (branch.getCompany() == null
                || !companyId.equals(branch.getCompany().getId())) {
            throw new ResourceNotFoundException("Branch not found with id: " + branch.getId());
        }
    }

    private UserBranchContext getValidatedContext(Long userId, Long branchId) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with id: " + userId));

        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Branch not found with id: " + branchId));

        validateUserBelongsToCompany(user, companyId);
        validateBranchBelongsToCompany(branch, companyId);

        return new UserBranchContext(user, branch);
    }

    private record UserBranchContext(User user, Branch branch) {}
}

