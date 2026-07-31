package com.gonzalez.erp.modules.branches.exception;

public class BranchNameAlreadyExistsException extends RuntimeException {
    public BranchNameAlreadyExistsException(String name) {
        super("Branch with name '%s' already exists".formatted(name));
    }
}
