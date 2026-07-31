package com.gonzalez.erp.modules.roles.exception;

public class RoleNameAlreadyExistsException extends RuntimeException {
    public RoleNameAlreadyExistsException(String name) {
        super("Role with name '%s' already exists".formatted(name));
    }
}
