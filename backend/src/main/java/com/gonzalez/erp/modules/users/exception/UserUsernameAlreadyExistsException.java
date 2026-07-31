package com.gonzalez.erp.modules.users.exception;

public class UserUsernameAlreadyExistsException extends RuntimeException {
    public UserUsernameAlreadyExistsException(String username) {
        super("User with username '%s' already exists".formatted(username));
    }
}
