package com.gonzalez.erp.modules.auth.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.config.security.JwtUtil;
import com.gonzalez.erp.config.security.LoginAttemptService;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.auth.dto.request.ChangePasswordRequest;
import com.gonzalez.erp.modules.auth.dto.request.LoginRequest;
import com.gonzalez.erp.modules.auth.dto.response.CurrentUserResponse;
import com.gonzalez.erp.modules.auth.dto.response.LoginResponse;
import com.gonzalez.erp.modules.auth.dto.response.TokenResponse;
import com.gonzalez.erp.modules.auth.exception.InvalidPasswordChangeException;
import com.gonzalez.erp.modules.companies.exception.CompanyNotActiveException;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final LoginAttemptService loginAttemptService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public LoginResponse login(LoginRequest request, String clientIp) {
        loginAttemptService.checkAllowed(request.username(), clientIp);

        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        } catch (AuthenticationException e) {
            loginAttemptService.recordFailure(request.username(), clientIp);
            throw e;
        }
        loginAttemptService.recordSuccess(request.username());

        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        // Se chequea después de validar la contraseña para no revelar el estado
        // de la empresa a quien no conoce las credenciales.
        if (!userDetails.isCompanyActive()) {
            throw new CompanyNotActiveException(userDetails.getCompanyStatus());
        }

        String token = jwtUtil.generateToken(userDetails);

        return new LoginResponse(
                token,
                "Bearer",
                userDetails.getUserId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                userDetails.getFirstName(),
                userDetails.getLastName(),
                userDetails.getRoleName(),
                userDetails.getPermissions(),
                userDetails.isPlatformAdmin(),
                userDetails.getCompanyId(),
                userDetails.getCompanyName(),
                !userDetails.isPasswordManagedByAdmin()
        );
    }

    @Override
    @Transactional
    public TokenResponse changePassword(ChangePasswordRequest request, String clientIp) {
        CustomUserDetails current = SecurityUtils.getCurrentUserDetails();
        // Adivinar la contraseña actual con una sesión robada cuenta como intento fallido.
        loginAttemptService.checkAllowed(current.getUsername(), clientIp);

        User user = userRepository.findById(current.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.isPasswordManagedByAdmin()) {
            throw InvalidPasswordChangeException.managedByAdmin();
        }
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            loginAttemptService.recordFailure(current.getUsername(), clientIp);
            throw InvalidPasswordChangeException.wrongCurrentPassword();
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw InvalidPasswordChangeException.sameAsCurrent();
        }

        user.updatePassword(passwordEncoder.encode(request.newPassword()));
        loginAttemptService.recordSuccess(current.getUsername());

        // El cambio revoca todos los tokens anteriores; esta sesión sigue con uno nuevo.
        return new TokenResponse(jwtUtil.generateToken(new CustomUserDetails(user)), "Bearer");
    }

    /**
     * JwtAuthFilter recarga el usuario en cada request, así que el principal ya trae el rol y
     * los permisos vigentes: un cambio de rol se ve sin volver a loguearse.
     */
    @Override
    public CurrentUserResponse currentUser() {
        CustomUserDetails current = SecurityUtils.getCurrentUserDetails();
        return new CurrentUserResponse(
                current.getUserId(),
                current.getUsername(),
                current.getEmail(),
                current.getFirstName(),
                current.getLastName(),
                current.getRoleName(),
                current.getPermissions(),
                current.isPlatformAdmin(),
                current.getCompanyId(),
                current.getCompanyName(),
                !current.isPasswordManagedByAdmin()
        );
    }

    /**
     * Sesión deslizante: quien usa la app recibe un token nuevo con la duración completa.
     * Sin riesgo de extender un acceso revocado: JwtAuthFilter ya rechazó la request si el
     * usuario está desactivado, su empresa no está activa o cambió la contraseña.
     */
    @Override
    public TokenResponse refreshToken() {
        return new TokenResponse(jwtUtil.generateToken(SecurityUtils.getCurrentUserDetails()), "Bearer");
    }
}
