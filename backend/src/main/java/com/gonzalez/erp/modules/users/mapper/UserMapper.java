package com.gonzalez.erp.modules.users.mapper;

import com.gonzalez.erp.modules.users.dto.response.UserResponse;
import com.gonzalez.erp.modules.users.entity.User;

public final class UserMapper {
    private UserMapper() {}

    public static UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole() != null ? user.getRole().getId() : null,
                user.getRole() != null ? user.getRole().getName() : null,
                user.getCompany() != null ? user.getCompany().getId() : null,
                user.getCompany() != null ? user.getCompany().getName() : null,
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
