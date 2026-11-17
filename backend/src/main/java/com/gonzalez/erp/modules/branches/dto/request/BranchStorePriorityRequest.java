package com.gonzalez.erp.modules.branches.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/** Las sucursales que venden por la web, de la primera a la última; las que no están no participan. */
public record BranchStorePriorityRequest(
        @NotNull(message = "branchIds is required")
        List<@NotNull(message = "branchIds cannot contain nulls") Long> branchIds
) {}
