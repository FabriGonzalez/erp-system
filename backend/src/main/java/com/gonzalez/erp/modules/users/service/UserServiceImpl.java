package com.gonzalez.erp.modules.users.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public List<UserResponse> findAll(Boolean active) {
        List<User> users = (active != null)
                ? userRepository.findByActive(active)
                : userRepository.findAll();
        return users.stream().map(UserMapper::toResponse).toList();
    }

    @Override
    public UserResponse findById(Long id) {
        return UserMapper.toResponse(findUserOrThrow(id));
    }

    @Override
    @Transactional
    public UserResponse create(UserRequest request) {
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
                .build();
        return UserMapper.toResponse(userRepository.save(user));
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = findUserOrThrow(id);

        if (!user.getEmail().equals(request.email())
                && userRepository.existsByEmail(request.email())) {
            throw new UserEmailAlreadyExistsException(request.email());
        }
        if (!user.getUsername().equals(request.username())
                && userRepository.existsByUsername(request.username())) {
            throw new UserUsernameAlreadyExistsException(request.username());
        }
        Role role = roleRepository.findById(request.roleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + request.roleId()));

        user.update(request.username(), request.email(), request.firstName(), request.lastName(), role);
        return UserMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse deactivate(Long id) {
        User user = findUserOrThrow(id);
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

    private User findUserOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }
}
