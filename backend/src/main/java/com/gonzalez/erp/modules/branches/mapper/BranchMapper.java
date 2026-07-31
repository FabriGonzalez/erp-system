package com.gonzalez.erp.modules.branches.mapper;

import com.gonzalez.erp.modules.branches.dto.response.BranchResponse;
import com.gonzalez.erp.modules.branches.entity.Branch;

public final class BranchMapper {
    private BranchMapper() {}

    public static BranchResponse toResponse(Branch branch) {
        return new BranchResponse(
                branch.getId(),
                branch.getName(),
                branch.getAddress(),
                branch.getPhone(),
                branch.isActive(),
                branch.getCreatedAt(),
                branch.getUpdatedAt()
        );
    }
}
