package com.gonzalez.erp.modules.auth.exception;

import lombok.Getter;

@Getter
public class TooManyLoginAttemptsException extends RuntimeException {

    private final long retryAfterSeconds;

    public TooManyLoginAttemptsException(long retryAfterSeconds) {
        super("Too many failed attempts. Try again in %d seconds".formatted(retryAfterSeconds));
        this.retryAfterSeconds = retryAfterSeconds;
    }
}
