package com.gonzalez.erp.modules.auth.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Current password is required")
        String currentPassword,

        // BCrypt solo considera los primeros 72 bytes, de ahí el máximo.
        @NotBlank(message = "New password is required")
        @Size(min = 8, max = 72, message = "New password must be between 8 and 72 characters")
        @Pattern(regexp = "^(?=.*\\p{L})(?=.*\\d).+$",
                 message = "New password must contain at least one letter and one number")
        String newPassword,

        @NotBlank(message = "Password confirmation is required")
        String confirmPassword
) {
    @AssertTrue(message = "Password confirmation does not match")
    public boolean isConfirmationMatching() {
        return newPassword == null || newPassword.equals(confirmPassword);
    }
}
