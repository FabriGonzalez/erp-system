package com.gonzalez.erp.modules.auth.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.config.security.JwtUtil;
import com.gonzalez.erp.modules.auth.dto.request.LoginRequest;
import com.gonzalez.erp.modules.auth.dto.request.RegisterRequest;
import com.gonzalez.erp.modules.auth.dto.response.LoginResponse;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.exception.UserEmailAlreadyExistsException;
import com.gonzalez.erp.modules.users.exception.UserUsernameAlreadyExistsException;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public LoginResponse login(LoginRequest request) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
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
                userDetails.getPermissions()
        );
    }

    @Override
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new UserEmailAlreadyExistsException(request.email());
        }

        if (userRepository.existsByUsername(request.username())) {
            throw new UserUsernameAlreadyExistsException(request.username());
        }

        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + request.roleId()));

        User user = User.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .email(request.email())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(role)
                .active(true)
                .build();

        userRepository.save(user);
    }
}
