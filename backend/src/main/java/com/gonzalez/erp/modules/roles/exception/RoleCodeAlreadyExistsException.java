package com.gonzalez.erp.modules.roles.exception;

public class RoleCodeAlreadyExistsException extends RuntimeException {
    public RoleCodeAlreadyExistsException(String code) {
        super("Role with code '%s' already exists".formatted(code));
    }
}
