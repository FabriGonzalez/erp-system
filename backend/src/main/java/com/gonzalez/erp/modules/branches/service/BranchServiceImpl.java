package com.gonzalez.erp.modules.branches.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.dto.request.BranchRequest;
import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchNameAlreadyExistsException;
import com.gonzalez.erp.modules.branches.mapper.BranchMapper;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.users.entity.UserBranch;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchServiceImpl implements BranchService {

    private final BranchRepository branchRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final UserBranchRepository userBranchRepository;

    @Override
    public List<BranchResponse> findAll(Boolean active) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<Branch> branches = (active != null)
                ? branchRepository.findByCompanyIdAndActive(companyId, active)
                : branchRepository.findByCompanyId(companyId);
        return branches.stream().map(BranchMapper::toResponse).toList();
    }

    @Override
    public BranchResponse findById(Long id) {
        return BranchMapper.toResponse(findBranchOrThrow(id));
    }

    @Override
    @Transactional
    public BranchResponse create(BranchRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        if (branchRepository.existsByNameAndCompanyId(request.name(), companyId)) {
            throw new BranchNameAlreadyExistsException(request.name());
        }
        Company company = companyRepository.getReferenceById(companyId);
        Branch branch = Branch.builder()
                .name(request.name())
                .address(request.address())
                .phone(request.phone())
                .company(company)
                .build();
        Branch saved = branchRepository.save(branch);
        assignToCreatorAndAllBranchesUsers(saved, companyId);
        return BranchMapper.toResponse(saved);
    }

    /*
     * El acceso a una sucursal sale siempre de user_branches. Quien la crea y los usuarios con
     * ACCEDER_TODAS_SUCURSALES quedan asignados; después cada uno se puede quitar desde Sucursales.
     */
    private void assignToCreatorAndAllBranchesUsers(Branch branch, Long companyId) {
        Set<Long> userIds = new LinkedHashSet<>();
        userIds.add(SecurityUtils.getCurrentUserId());
        userRepository.findByCompanyIdAndRolePermission(companyId, Permission.ACCEDER_TODAS_SUCURSALES)
                .forEach(user -> userIds.add(user.getId()));

        List<UserBranch> assignments = userIds.stream()
                .map(userId -> UserBranch.builder()
                        .user(userRepository.getReferenceById(userId))
                        .branch(branch)
                        .build())
                .toList();
        userBranchRepository.saveAll(assignments);
    }

    @Override
    @Transactional
    public BranchResponse update(Long id, BranchRequest request) {
        Branch branch = findBranchOrThrow(id);
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        branchRepository.findByNameAndCompanyId(request.name(), companyId)
                .filter(b -> !b.getId().equals(id))
                .ifPresent(b -> {
                    throw new BranchNameAlreadyExistsException(request.name());
                });
        branch.update(request.name(), request.address(), request.phone());
        return BranchMapper.toResponse(branch);
    }

    @Override
    @Transactional
    public BranchResponse deactivate(Long id) {
        Branch branch = findBranchOrThrow(id);
        branch.deactivate();
        return BranchMapper.toResponse(branch);
    }

    @Override
    @Transactional
    public BranchResponse activate(Long id) {
        Branch branch = findBranchOrThrow(id);
        branch.activate();
        return BranchMapper.toResponse(branch);
    }

    private Branch findBranchOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return branchRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Branch not found with id: " + id));
    }
}
