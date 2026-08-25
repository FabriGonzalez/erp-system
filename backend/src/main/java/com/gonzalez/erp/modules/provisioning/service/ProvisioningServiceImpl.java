package com.gonzalez.erp.modules.provisioning.service;

import com.gonzalez.erp.config.security.SecurityUtils;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.exception.CompanyNameAlreadyExistsException;
import com.gonzalez.erp.modules.companies.exception.CompanyTaxIdAlreadyExistsException;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.provisioning.dto.request.ProvisionCompanyRequest;
import com.gonzalez.erp.modules.provisioning.dto.response.ProvisionCompanyResponse;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.exception.UserEmailAlreadyExistsException;
import com.gonzalez.erp.modules.users.exception.UserUsernameAlreadyExistsException;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.EnumSet;

@Service
@RequiredArgsConstructor
@Transactional
public class ProvisioningServiceImpl implements ProvisioningService {

    private final CompanyRepository companyRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public ProvisionCompanyResponse provisionCompany(ProvisionCompanyRequest request) {
        checkPlatformAdminRole();

        validateUniqueness(request);

        String temporaryPassword = generateTemporaryPassword();

        Company company = companyRepository.save(Company.builder()
                .name(request.companyName())
                .legalName(request.legalName())
                .taxId(request.taxId())
                .active(true)
                .build());

        Role adminRole = roleRepository.findByCode("ADMIN")
                .orElseGet(this::createAdminRole);

        User admin = userRepository.save(User.builder()
                .username(request.adminUsername())
                .email(request.adminEmail())
                .firstName(defaultIfBlank(request.adminFirstName(), "Admin"))
                .lastName(defaultIfBlank(request.adminLastName(), "User"))
                .password(passwordEncoder.encode(temporaryPassword))
                .role(adminRole)
                .company(company)
                .active(true)
                .build());

        return new ProvisionCompanyResponse(
                company.getId(),
                company.getName(),
                company.getLegalName(),
                company.getTaxId(),
                admin.getId(),
                admin.getUsername(),
                admin.getEmail(),
                temporaryPassword
        );
    }

    private void checkPlatformAdminRole() {
        String roleCode = SecurityUtils.getCurrentUserDetails().getRoleCode();
        if (!"PLATFORM_ADMIN".equals(roleCode)) {
            throw new AccessDeniedException("Only PLATFORM_ADMIN can provision companies");
        }
    }

    private void validateUniqueness(ProvisionCompanyRequest request) {
        if (companyRepository.existsByName(request.companyName())) {
            throw new CompanyNameAlreadyExistsException(
                    request.companyName());
        }
        if (userRepository.existsByUsername(request.adminUsername())) {
            throw new UserUsernameAlreadyExistsException(
                    request.adminUsername());
        }
        if (userRepository.existsByEmail(request.adminEmail())) {
            throw new UserEmailAlreadyExistsException(
                    request.adminEmail());
        }

        if (request.taxId() != null
                && !request.taxId().isBlank()
                && companyRepository.existsByTaxId(request.taxId())) {
            throw new CompanyTaxIdAlreadyExistsException(request.taxId());
        }
    }

    private String generateTemporaryPassword() {
        byte[] bytes = new byte[16];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private Role createAdminRole() {
        return roleRepository.save(Role.builder()
                .name("Administrador")
                .code("ADMIN")
                .description("Rol con acceso total al sistema")
                .permissions(EnumSet.allOf(Permission.class))
                .active(true)
                .build());
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return (value == null || value.isBlank()) ? defaultValue : value;
    }
}
