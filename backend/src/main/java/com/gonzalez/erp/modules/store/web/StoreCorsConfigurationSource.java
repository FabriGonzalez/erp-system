package com.gonzalez.erp.modules.store.web;

import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

/**
 * CORS de /store/**: el navegador solo deja leer las respuestas a la página de una tienda
 * registrada y habilitada. La lista no es fija: sale de los dominios cargados por el operador.
 */
public class StoreCorsConfigurationSource implements CorsConfigurationSource {

    private final CompanyRepository companyRepository;

    public StoreCorsConfigurationSource(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @Override
    public CorsConfiguration getCorsConfiguration(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        boolean registered = StoreDomains.normalize(origin)
                .flatMap(companyRepository::findByStoreDomain)
                .filter(Company::isStoreOpen)
                .isPresent();
        if (!registered) {
            // Sin configuración el navegador no recibe permiso y bloquea la respuesta.
            return null;
        }

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(origin));
        configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", StoreResolutionFilter.DOMAIN_HEADER));
        // Sin cookies: el comprador (22B) se identifica con un token en Authorization.
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(600L);
        return configuration;
    }
}
