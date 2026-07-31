package com.gonzalez.erp.modules.users.service;

import com.gonzalez.erp.modules.users.dto.request.UserRequest;
import com.gonzalez.erp.modules.users.dto.request.UserUpdateRequest;
import com.gonzalez.erp.modules.users.dto.response.UserResponse;

import java.util.List;

public interface UserService {
    List<UserResponse> findAll(Boolean active);
    UserResponse findById(Long id);
    UserResponse create(UserRequest request);
    UserResponse update(Long id, UserUpdateRequest request);
    UserResponse deactivate(Long id);
    UserResponse activate(Long id);
}
