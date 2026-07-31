package com.gonzalez.erp.modules.users.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
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
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with id: " + userId);
        }
        return userBranchRepository.findByUserId(userId).stream()
                .map(UserBranch::getBranch)
                .map(BranchMapper::toResponse)
                .toList();
    }

    @Override
    public List<UserResponse> findUsersByBranchId(Long branchId) {
        if (!branchRepository.existsById(branchId)) {
            throw new ResourceNotFoundException("Branch not found with id: " + branchId);
        }
        return userBranchRepository.findByBranchId(branchId).stream()
                .map(UserBranch::getUser)
                .map(UserMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public void assignUserToBranch(Long userId, Long branchId) {
        if (userBranchRepository.existsByUserIdAndBranchId(userId, branchId)) {
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        Branch branch = branchRepository.findById(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + branchId));
        userBranchRepository.save(UserBranch.builder()
                .user(user)
                .branch(branch)
                .build());
    }

    @Override
    @Transactional
    public void removeUserFromBranch(Long userId, Long branchId) {
        UserBranch userBranch = userBranchRepository.findByUserIdAndBranchId(userId, branchId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User %d is not assigned to branch %d".formatted(userId, branchId)));
        userBranchRepository.delete(userBranch);
    }
}
