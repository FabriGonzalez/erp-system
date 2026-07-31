package com.gonzalez.erp.modules.roles.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.modules.roles.dto.request.RoleRequest;
import com.gonzalez.erp.modules.roles.dto.response.RoleResponse;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.exception.RoleCodeAlreadyExistsException;
import com.gonzalez.erp.modules.roles.exception.RoleNameAlreadyExistsException;
import com.gonzalez.erp.modules.roles.mapper.RoleMapper;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    @Override
    public List<RoleResponse> findAll(Boolean active) {
        List<Role> roles = (active != null)
                ? roleRepository.findByActive(active)
                : roleRepository.findAll();
        return roles.stream().map(RoleMapper::toResponse).toList();
    }

    @Override
    public RoleResponse findById(Long id) {
        return RoleMapper.toResponse(findRoleOrThrow(id));
    }

    @Override
    @Transactional
    public RoleResponse create(RoleRequest request) {
        if (roleRepository.existsByName(request.name())) {
            throw new RoleNameAlreadyExistsException(request.name());
        }
        if (roleRepository.existsByCode(request.code())) {
            throw new RoleCodeAlreadyExistsException(request.code());
        }
        Role role = Role.builder()
                .name(request.name())
                .code(request.code())
                .description(request.description())
                .permissions(request.permissions())
                .build();
        return RoleMapper.toResponse(roleRepository.save(role));
    }

    @Override
    @Transactional
    public RoleResponse update(Long id, RoleRequest request) {
        Role role = findRoleOrThrow(id);
        roleRepository.findByName(request.name())
                .filter(r -> !r.getId().equals(id))
                .ifPresent(r -> {
                    throw new RoleNameAlreadyExistsException(request.name());
                });
        roleRepository.findByCode(request.code())
                .filter(r -> !r.getId().equals(id))
                .ifPresent(r -> {
                    throw new RoleCodeAlreadyExistsException(request.code());
                });
        role.update(request.name(), request.code(), request.description(), request.permissions());
        return RoleMapper.toResponse(role);
    }

    @Override
    @Transactional
    public RoleResponse deactivate(Long id) {
        Role role = findRoleOrThrow(id);
        role.deactivate();
        return RoleMapper.toResponse(role);
    }

    @Override
    @Transactional
    public RoleResponse activate(Long id) {
        Role role = findRoleOrThrow(id);
        role.activate();
        return RoleMapper.toResponse(role);
    }

    private Role findRoleOrThrow(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + id));
    }
}
