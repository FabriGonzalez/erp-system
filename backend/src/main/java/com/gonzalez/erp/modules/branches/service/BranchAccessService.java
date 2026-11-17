package com.gonzalez.erp.modules.branches.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.branches.exception.BranchAccessDeniedException;
import com.gonzalez.erp.modules.branches.exception.BranchInactiveException;
import com.gonzalez.erp.modules.branches.repository.BranchRepository;
import com.gonzalez.erp.modules.users.repository.UserBranchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/*
 * Único lugar que decide a qué sucursales accede el usuario actual: las asignadas (user_branches)
 * de su empresa y activas. Desactivar una sucursal no borra las asignaciones, así que una inactiva
 * cuenta como no asignada hasta que se reactive.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BranchAccessService {

    private final BranchRepository branchRepository;
    private final UserBranchRepository userBranchRepository;

    /** Sucursales accesibles para el usuario actual, ordenadas por id. */
    public List<Long> accessibleBranchIds() {
        return userBranchRepository.findAccessibleBranchIds(
                SecurityUtils.getCurrentUserId(), SecurityUtils.requireCurrentCompanyId());
    }

    /** Para entidades ya filtradas por empresa (pedido, pago, transferencia). */
    public boolean isAccessible(Branch branch) {
        return branch != null
                && branch.isActive()
                && userBranchRepository.existsByUserIdAndBranchId(
                        SecurityUtils.getCurrentUserId(), branch.getId());
    }

    /** 404 si la sucursal no es de la empresa; 403 si no está asignada o está inactiva. */
    public Branch requireAccessible(Long branchId) {
        Branch branch = findInCompanyOrThrow(branchId);
        requireAccessible(branch);
        return branch;
    }

    /** 403 si no está asignada o está inactiva, para entidades ya filtradas por empresa. */
    public void requireAccessible(Branch branch) {
        if (!isAccessible(branch)) {
            throw new BranchAccessDeniedException(branch.getId());
        }
    }

    /** Sin chequear asignación (destino de una transferencia): 404 si no es de la empresa, 409 si está inactiva. */
    public Branch requireActive(Long branchId) {
        Branch branch = findInCompanyOrThrow(branchId);
        if (!branch.isActive()) {
            throw new BranchInactiveException(branchId);
        }
        return branch;
    }

    private Branch findInCompanyOrThrow(Long branchId) {
        return branchRepository.findByIdAndCompanyId(branchId, SecurityUtils.requireCurrentCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Branch not found with id: " + branchId + " in the current company"));
    }
}
