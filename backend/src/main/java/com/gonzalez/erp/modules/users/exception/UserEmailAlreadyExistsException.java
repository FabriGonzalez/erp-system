package com.gonzalez.erp.modules.users.exception;

public class UserEmailAlreadyExistsException extends RuntimeException {
    public UserEmailAlreadyExistsException(String email) {
        super("User with email '%s' already exists".formatted(email));
    }
}
