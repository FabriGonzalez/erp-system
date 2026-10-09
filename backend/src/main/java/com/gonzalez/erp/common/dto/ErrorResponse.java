package com.gonzalez.erp.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        String code
) {
    public static ErrorResponse of(int status, String error, String message, String path) {
        return of(status, error, message, path, null);
    }

    public static ErrorResponse of(int status, String error, String message, String path, String code) {
        return new ErrorResponse(
                Instant.now(),
                status,
                error,
                message,
                path,
                code
        );
    }
}
