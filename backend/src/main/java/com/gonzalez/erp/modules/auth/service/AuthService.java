package com.gonzalez.erp.modules.auth.service;

import com.gonzalez.erp.modules.auth.dto.request.ChangePasswordRequest;
import com.gonzalez.erp.modules.auth.dto.request.LoginRequest;
import com.gonzalez.erp.modules.auth.dto.response.CurrentUserResponse;
import com.gonzalez.erp.modules.auth.dto.response.LoginResponse;
import com.gonzalez.erp.modules.auth.dto.response.TokenResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request, String clientIp);

    TokenResponse changePassword(ChangePasswordRequest request, String clientIp);

    CurrentUserResponse currentUser();

    TokenResponse refreshToken();
}
