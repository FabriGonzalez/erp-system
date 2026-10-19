package com.gonzalez.erp.modules.users.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.LoginAttemptService;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import com.gonzalez.erp.modules.users.dto.request.UserRequest;
import com.gonzalez.erp.modules.users.dto.request.UserUpdateRequest;
import com.gonzalez.erp.modules.users.dto.response.UserResponse;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.exception.UserEmailAlreadyExistsException;
import com.gonzalez.erp.modules.users.exception.UserUsernameAlreadyExistsException;
import com.gonzalez.erp.modules.users.mapper.UserMapper;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;

    @Override
    public List<UserResponse> findAll(Boolean active) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<User> users = (active != null)
                ? userRepository.findByCompanyIdAndActive(companyId, active)
                : userRepository.findByCompanyId(companyId);
        return users.stream().map(UserMapper::toResponse).toList();
    }

    @Override
    public UserResponse findById(Long id) {
        return UserMapper.toResponse(findUserOrThrow(id));
    }

    @Override
    @Transactional
    public UserResponse create(UserRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        // Usuario y email son únicos en toda la plataforma (el login es por usuario), no por empresa.
        if (userRepository.existsByEmail(request.email())) {
            throw new UserEmailAlreadyExistsException(request.email());
        }
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new UserUsernameAlreadyExistsException(request.username());
        }
        Role role = findAssignableRoleOrThrow(request.roleId(), companyId);
        Company company = companyRepository.getReferenceById(companyId);

        User user = User.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .email(request.email())
                .firstName(request.firstName())
                .lastName(request.lastName())
                .role(role)
                .company(company)
                .passwordManagedByAdmin(true)
                .build();
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = findUserOrThrow(id);
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        // Cambiarse el rol a uno mismo puede dejar a la empresa sin quien administre usuarios.
        Long currentRoleId = user.getRole() != null ? user.getRole().getId() : null;
        if (user.getId().equals(SecurityUtils.getCurrentUserId())
                && !Objects.equals(currentRoleId, request.roleId())) {
            throw new AccessDeniedException("You cannot change your own role");
        }
        if (!user.getEmail().equals(request.email())
                && userRepository.existsByEmailAndIdNot(request.email(), id)) {
            throw new UserEmailAlreadyExistsException(request.email());
        }
        if (!user.getUsername().equalsIgnoreCase(request.username())
                && userRepository.existsByUsernameIgnoreCaseAndIdNot(request.username(), id)) {
            throw new UserUsernameAlreadyExistsException(request.username());
        }
        Role role = findAssignableRoleOrThrow(request.roleId(), companyId);

        user.update(request.username(), request.email(), request.firstName(), request.lastName(), role);
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse deactivate(Long id) {
        User user = findUserOrThrow(id);
        if (user.getId().equals(SecurityUtils.getCurrentUserId())) {
            throw new AccessDeniedException("You cannot deactivate your own user");
        }
        user.deactivate();
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse activate(Long id) {
        User user = findUserOrThrow(id);
        user.activate();
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = findUserOrThrow(id);
        // La propia se cambia con /auth/change-password, que exige la contraseña actual:
        // así una sesión robada de un admin no alcanza para quedarse con la cuenta.
        if (user.getId().equals(SecurityUtils.getCurrentUserId())) {
            throw new AccessDeniedException("Use change-password to change your own password");
        }

        // Cierra las sesiones abiertas del usuario.
        user.updatePassword(passwordEncoder.encode(newPassword));
        // Si el usuario estaba bloqueado por intentos fallidos, el reset lo habilita.
        loginAttemptService.recordSuccess(user.getUsername());
    }

    private Role findAssignableRoleOrThrow(Long roleId, Long companyId) {
        return roleRepository.findByIdAndCompanyId(roleId, companyId)
                .filter(Role::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + roleId));
    }

    private User findUserOrThrow(Long id) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();

        return userRepository.findById(id)
                .filter(user -> user.getCompany() != null
                        && companyId.equals(user.getCompany().getId()))
                .orElseThrow(() ->
                        new ResourceNotFoundException("User not found with id: " + id));
    }
}
