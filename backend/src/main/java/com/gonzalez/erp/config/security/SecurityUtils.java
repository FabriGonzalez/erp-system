package com.gonzalez.erp.config.security;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.AccessDeniedException;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static CustomUserDetails getCurrentUserDetails() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
            throw new ResourceNotFoundException("No authenticated user found");
        }
        return userDetails;
    }

    public static Long getCurrentUserId() {
        return getCurrentUserDetails().getUserId();
    }

    public static Long getCurrentCompanyId() {
        return getCurrentUserDetails().getCompanyId();
    }

    public static Long requireCurrentCompanyId() {
        Long companyId = getCurrentCompanyId();
        if (companyId == null) {
            throw new AccessDeniedException(
                    "This operation requires a company context");
        }
        return companyId;
    }

    public static String getCurrentUsername() {
        return getCurrentUserDetails().getUsername();
    }
}
