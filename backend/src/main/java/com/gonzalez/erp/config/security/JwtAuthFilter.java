package com.gonzalez.erp.config.security;

import com.gonzalez.erp.common.dto.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final JsonMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null) {
            JwtUtil.ValidatedToken validated = jwtUtil.validate(token);

            if (validated != null && validated.username() != null) {
                try {
                    // Se recarga el usuario en cada request: así desactivar un usuario,
                    // suspender su empresa o cambiar su contraseña corta el acceso de inmediato.
                    CustomUserDetails userDetails =
                            (CustomUserDetails) userDetailsService.loadUserByUsername(validated.username());

                    if (userDetails.isEnabled()
                            && !userDetails.isTokenIssuedBeforePasswordChange(validated.issuedAt())) {
                        if (!userDetails.isCompanyActive()) {
                            writeCompanyNotActive(request, response, userDetails);
                            return;
                        }

                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                } catch (UsernameNotFoundException e) {
                    SecurityContextHolder.clearContext();
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * 401 con código propio: el frontend ya trata cualquier 401 como fin de sesión y usa
     * el código solo para explicar el motivo.
     */
    private void writeCompanyNotActive(HttpServletRequest request,
                                       HttpServletResponse response,
                                       CustomUserDetails userDetails) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        ErrorResponse error = ErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                "Company is " + userDetails.getCompanyStatus().name().toLowerCase(),
                request.getRequestURI(),
                "COMPANY_" + userDetails.getCompanyStatus().name()
        );
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
