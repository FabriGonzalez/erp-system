package com.gonzalez.erp.config;

import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.roles.repository.RoleRepository;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.EnumSet;

@Component
@RequiredArgsConstructor
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@erp.local}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        if (adminPassword.isBlank()) {
            throw new IllegalStateException(
                    "No hay usuarios y ADMIN_PASSWORD no está seteada. Definila para crear el admin inicial.");
        }

        Role adminRole = roleRepository.findByCode("ADMIN")
                .orElseGet(this::createAdminRole);

        User admin = User.builder()
                .username("admin")
                .email(adminEmail)
                .firstName("Admin")
                .lastName("User")
                .password(passwordEncoder.encode(adminPassword))
                .role(adminRole)
                .build();

        userRepository.save(admin);
        System.out.println("Admin inicial creado: " + adminEmail);
    }

    private Role createAdminRole() {
        Role role = Role.builder()
                .name("Administrador")
                .code("ADMIN")
                .description("Rol con acceso total al sistema")
                .permissions(EnumSet.allOf(Permission.class))
                .active(true)
                .build();
        return roleRepository.save(role);
    }
}