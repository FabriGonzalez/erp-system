package com.gonzalez.erp.config;

import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DevDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.platform-admin.username:platform_admin}")
    private String platformAdminUsername;

    @Value("${app.platform-admin.email:platform@erp.local}")
    private String platformAdminEmail;

    @Value("${app.platform-admin.password:}")
    private String platformAdminPassword;

    @Override
    public void run(String... args) {
        if (userRepository.findByUsername(platformAdminUsername).isPresent()) {
            log.info("Platform admin '{}' already exists. Skipping.", platformAdminUsername);
            return;
        }

        if (platformAdminPassword.isBlank()) {
            throw new IllegalStateException(
                    "Platform admin does not exist and ERP_PLATFORM_ADMIN_PASSWORD is not set. "
                            + "Set the password to create the platform admin user.");
        }

        User platformAdmin = User.builder()
                .username(platformAdminUsername)
                .email(platformAdminEmail)
                .firstName("Platform")
                .lastName("Admin")
                .password(passwordEncoder.encode(platformAdminPassword))
                .role(null)
                .company(null)
                .platformAdmin(true)
                .active(true)
                .build();

        userRepository.save(platformAdmin);
        log.info("Platform admin '{}' created.", platformAdminUsername);
    }
}
