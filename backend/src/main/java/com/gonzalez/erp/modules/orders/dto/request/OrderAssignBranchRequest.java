package com.gonzalez.erp.modules.orders.dto.request;

import jakarta.validation.constraints.NotNull;

public record OrderAssignBranchRequest(
        @NotNull Long branchId
) {}
