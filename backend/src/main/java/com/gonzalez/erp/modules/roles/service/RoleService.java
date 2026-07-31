package com.gonzalez.erp.modules.roles.service;

import com.gonzalez.erp.modules.roles.dto.request.RoleRequest;
import com.gonzalez.erp.modules.roles.dto.response.RoleResponse;

import java.util.List;

public interface RoleService {
    List<RoleResponse> findAll(Boolean active);
    RoleResponse findById(Long id);
    RoleResponse create(RoleRequest request);
    RoleResponse update(Long id, RoleRequest request);
    RoleResponse deactivate(Long id);
    RoleResponse activate(Long id);
}
