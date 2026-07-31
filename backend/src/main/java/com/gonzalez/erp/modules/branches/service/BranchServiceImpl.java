package com.gonzalez.erp.modules.branches.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.branches.dto.request.BranchRequest;
import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchNameAlreadyExistsException;
import com.gonzalez.erp.modules.branches.mapper.BranchMapper;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchServiceImpl implements BranchService {

    private final BranchRepository branchRepository;

    @Override
    public List<BranchResponse> findAll(Boolean active) {
        List<Branch> branches = (active != null)
                ? branchRepository.findByActive(active)
                : branchRepository.findAll();
        return branches.stream().map(BranchMapper::toResponse).toList();
    }

    @Override
    public BranchResponse findById(Long id) {
        return BranchMapper.toResponse(findBranchOrThrow(id));
    }

    @Override
    @Transactional
    public BranchResponse create(BranchRequest request) {
        if (branchRepository.existsByName(request.name())) {
            throw new BranchNameAlreadyExistsException(request.name());
        }
        Branch branch = Branch.builder()
                .name(request.name())
                .address(request.address())
                .phone(request.phone())
                .build();
        return BranchMapper.toResponse(branchRepository.save(branch));
    }

    @Override
    @Transactional
    public BranchResponse update(Long id, BranchRequest request) {
        Branch branch = findBranchOrThrow(id);
        branchRepository.findByName(request.name())
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
        return branchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Branch not found with id: " + id));
    }
}
