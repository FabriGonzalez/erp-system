package com.gonzalez.erp.modules.branches.service;

import com.gonzalez.erp.modules.branches.dto.request.BranchRequest;
import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;

import java.util.List;

public interface BranchService {
    List<BranchResponse> findAll(Boolean active);
    BranchResponse findById(Long id);
    BranchResponse create(BranchRequest request);
    BranchResponse update(Long id, BranchRequest request);
    BranchResponse deactivate(Long id);
    BranchResponse activate(Long id);
}
