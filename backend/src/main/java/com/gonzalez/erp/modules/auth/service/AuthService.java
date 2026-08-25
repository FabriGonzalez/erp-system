package com.gonzalez.erp.modules.auth.service;

import com.gonzalez.erp.modules.auth.dto.request.LoginRequest;
import com.gonzalez.erp.modules.auth.dto.response.LoginResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request);
}
