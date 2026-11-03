package com.gonzalez.erp.modules.store.web;

import com.gonzalez.erp.common.dto.ErrorResponse;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.util.Optional;

/**
 * Resuelve de qué empresa es la tienda que hace el pedido: por X-Store-Domain (la tienda
 * renderizada en un servidor, donde no hay navegador que ponga Origin) o por Origin.
 * No es una autorización: lo que se ve con el dominio es lo mismo que muestra la tienda.
 * No es un @Component a propósito: así Spring no lo registra para todas las rutas.
 */
public class StoreResolutionFilter extends OncePerRequestFilter {

    public static final String DOMAIN_HEADER = "X-Store-Domain";

    private final CompanyRepository companyRepository;
    private final JsonMapper objectMapper;

    public StoreResolutionFilter(CompanyRepository companyRepository, JsonMapper objectMapper) {
        this.companyRepository = companyRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requested = Optional.ofNullable(request.getHeader(DOMAIN_HEADER))
                .orElse(request.getHeader("Origin"));

        Optional<Company> company = StoreDomains.normalize(requested)
                .flatMap(companyRepository::findByStoreDomain)
                .filter(Company::isStoreOpen);

        if (company.isEmpty()) {
            // 404 y no 403: no se revela si la empresa existe o si su tienda está apagada.
            writeStoreNotFound(request, response);
            return;
        }

        Company store = company.get();
        request.setAttribute(CurrentStore.ATTRIBUTE,
                new CurrentStore(store.getId(), store.getName(), store.getStoreDomain()));
        filterChain.doFilter(request, response);
    }

    private void writeStoreNotFound(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.NOT_FOUND.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse error = ErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                "Store not found",
                request.getRequestURI(),
                "STORE_NOT_FOUND"
        );
        response.getWriter().write(objectMapper.writeValueAsString(error));
    }
}
