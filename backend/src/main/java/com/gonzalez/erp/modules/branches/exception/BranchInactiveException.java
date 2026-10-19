package com.gonzalez.erp.modules.branches.exception;

public class BranchInactiveException extends RuntimeException {

    public BranchInactiveException(Long branchId) {
        super("Branch is inactive: " + branchId);
    }
}
