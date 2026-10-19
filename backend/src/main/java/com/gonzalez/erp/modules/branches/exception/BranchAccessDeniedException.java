package com.gonzalez.erp.modules.branches.exception;

import org.springframework.security.access.AccessDeniedException;

/** La sucursal es de la empresa pero el usuario no la tiene asignada o está inactiva. */
public class BranchAccessDeniedException extends AccessDeniedException {

    public BranchAccessDeniedException(Long branchId) {
        super("User is not assigned to branch or the branch is inactive: " + branchId);
    }
}
