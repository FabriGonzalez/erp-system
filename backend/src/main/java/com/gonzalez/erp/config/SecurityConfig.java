package com.gonzalez.erp.config;

import tools.jackson.databind.json.JsonMapper;
import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.config.security.JwtAuthFilter;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.store.web.StoreCorsConfigurationSource;
import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.security.StoreCustomerAuthFilter;
import com.gonzalez.erp.modules.store.security.StoreTokenService;
import com.gonzalez.erp.modules.store.web.StoreResolutionFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final JsonMapper objectMapper;

    // Orígenes web que pueden llamar a la API: "*" en desarrollo; en producción el dominio de la
    // web (CORS_ALLOWED_ORIGINS). Las apps de celular no pasan por CORS.
    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config
    ) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        configuration.setExposedHeaders(List.of("Retry-After"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setStatus(HttpStatus.UNAUTHORIZED.value());

            ErrorResponse error = ErrorResponse.of(
                    HttpStatus.UNAUTHORIZED.value(),
                    "Unauthorized",
                    authException.getMessage(),
                    request.getRequestURI()
            );

            response.getWriter().write(objectMapper.writeValueAsString(error));
        };
    }

    @Bean
    public AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setStatus(HttpStatus.FORBIDDEN.value());

            ErrorResponse error = ErrorResponse.of(
                    HttpStatus.FORBIDDEN.value(),
                    "Forbidden",
                    accessDeniedException.getMessage(),
                    request.getRequestURI()
            );

            response.getWriter().write(objectMapper.writeValueAsString(error));
        };
    }

    // Como @Component, Spring registraría JwtAuthFilter para todas las rutas, /store/** incluida.
    // Así corre solo dentro de la cadena del ERP: un token de empleado nunca entra a la tienda.
    @Bean
    public FilterRegistrationBean<JwtAuthFilter> jwtAuthFilterRegistration(JwtAuthFilter filter) {
        FilterRegistrationBean<JwtAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * Tienda web: la empresa sale del dominio y el CORS solo admite tiendas registradas. El
     * catálogo y /store/auth/** son públicos; /store/me/** exige el token de comprador de esa
     * tienda (StoreCustomerAuthFilter). El token de empleado acá no vale.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain storeSecurityFilterChain(
            HttpSecurity http,
            CompanyRepository companyRepository,
            StoreTokenService storeTokenService,
            StoreAccountRepository storeAccountRepository
    ) throws Exception {
        return http
                .securityMatcher("/api/v1/store/**")
                .cors(cors -> cors.configurationSource(new StoreCorsConfigurationSource(companyRepository)))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/store/me", "/api/v1/store/me/**").hasRole("STORE_CUSTOMER")
                        .anyRequest().permitAll())
                .addFilterAfter(new StoreResolutionFilter(companyRepository, objectMapper), CorsFilter.class)
                .addFilterAfter(new StoreCustomerAuthFilter(storeTokenService, storeAccountRepository),
                        StoreResolutionFilter.class)
                .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            Environment environment
    ) throws Exception {
        boolean dev = environment.acceptsProfiles(Profiles.of("dev"));
        return http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .authorizeHttpRequests(auth -> {
                    // El callback de Mercado Pago lo abre el navegador del admin, sin el token del
                    // ERP; la empresa sale del state cifrado. El webhook lo llama Mercado Pago y se
                    // protege con la firma.
                    auth.requestMatchers("/api/v1/auth/login", "/api/v1/mercadopago/oauth/callback", "/error")
                            .permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/api/v1/mercadopago/webhook").permitAll();
                    if (dev) {
                        auth.requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs/**"
                        ).permitAll();
                    }
                    auth.requestMatchers("/api/v1/provisioning/**")
                            .hasRole("PLATFORM_ADMIN")
                            .anyRequest().authenticated();
                })
                .addFilterBefore(
                        jwtAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }
}