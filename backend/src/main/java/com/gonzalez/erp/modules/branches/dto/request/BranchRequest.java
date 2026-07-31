package com.gonzalez.erp.modules.branches.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BranchRequest(
        @NotBlank(message = "Branch name is required")
        @Size(max = 100, message = "Branch name must not exceed 100 characters")
        String name,

        @Size(max = 200, message = "Address must not exceed 200 characters")
        String address,

        @Size(max = 20, message = "Phone must not exceed 20 characters")
        String phone
) {}
