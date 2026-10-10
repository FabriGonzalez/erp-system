package com.gonzalez.erp.modules.roles.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.roles.dto.request.RoleRequest;
import com.gonzalez.erp.modules.roles.dto.response.RoleResponse;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.exception.RoleCodeAlreadyExistsException;
import com.gonzalez.erp.modules.roles.exception.RoleNameAlreadyExistsException;
import com.gonzalez.erp.modules.roles.mapper.RoleMapper;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final CompanyRepository companyRepository;

    @Override
    public List<RoleResponse> findAll(Boolean active) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        List<Role> roles = (active != null)
                ? roleRepository.findByCompanyIdAndActive(companyId, active)
                : roleRepository.findByCompanyId(companyId);
        return roles.stream().map(RoleMapper::toResponse).toList();
    }

    @Override
    public RoleResponse findById(Long id) {
        return RoleMapper.toResponse(findRoleOrThrow(id));
    }

    @Override
    @Transactional
    public RoleResponse create(RoleRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        if (roleRepository.existsByNameAndCompanyId(request.name(), companyId)) {
            throw new RoleNameAlreadyExistsException(request.name());
        }
        if (roleRepository.existsByCodeAndCompanyId(request.code(), companyId)) {
            throw new RoleCodeAlreadyExistsException(request.code());
        }
        Role role = Role.builder()
                .company(companyRepository.getReferenceById(companyId))
                .name(request.name())
                .code(request.code())
                .description(request.description())
                .permissions(copyPermissions(request))
                .build();
        return RoleMapper.toResponse(roleRepository.save(role));
    }

    @Override
    @Transactional
    public RoleResponse update(Long id, RoleRequest request) {
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        Role role = findModifiableRoleOrThrow(id);
        if (roleRepository.existsByNameAndCompanyIdAndIdNot(request.name(), companyId, id)) {
            throw new RoleNameAlreadyExistsException(request.name());
        }
        if (roleRepository.existsByCodeAndCompanyIdAndIdNot(request.code(), companyId, id)) {
            throw new RoleCodeAlreadyExistsException(request.code());
        }
        role.update(request.name(), request.code(), request.description(), copyPermissions(request));
        return RoleMapper.toResponse(role);
    }

    @Override
    @Transactional
    public RoleResponse deactivate(Long id) {
        Role role = findModifiableRoleOrThrow(id);
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
        Long companyId = SecurityUtils.requireCurrentCompanyId();
        return roleRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + id));
    }

    private Role findModifiableRoleOrThrow(Long id) {
        Role role = findRoleOrThrow(id);
        if (role.isSystem()) {
            throw new AccessDeniedException("System roles cannot be modified");
        }
        return role;
    }

    private EnumSet<Permission> copyPermissions(RoleRequest request) {
        return request.permissions() == null || request.permissions().isEmpty()
                ? EnumSet.noneOf(Permission.class)
                : EnumSet.copyOf(request.permissions());
    }
}
