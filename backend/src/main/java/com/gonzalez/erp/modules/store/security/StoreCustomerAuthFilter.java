package com.gonzalez.erp.modules.store.security;

import com.gonzalez.erp.modules.store.entity.StoreAccount;
import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.security.StoreTokenService.StoreTokenClaims;
import com.gonzalez.erp.modules.store.web.CurrentStore;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Autentica al comprador en la cadena de /store/** (corre después de StoreResolutionFilter, que
 * ya resolvió la tienda). Un token inválido no corta el request: queda sin autenticar, y
 * /store/me/** responde 401 mientras el catálogo sigue público.
 * No es un @Component a propósito: así Spring no lo registra para las rutas del ERP.
 */
public class StoreCustomerAuthFilter extends OncePerRequestFilter {

    private final StoreTokenService tokenService;
    private final StoreAccountRepository accountRepository;

    public StoreCustomerAuthFilter(StoreTokenService tokenService, StoreAccountRepository accountRepository) {
        this.tokenService = tokenService;
        this.accountRepository = accountRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            StoreTokenClaims claims = tokenService.validate(header.substring(7));
            if (claims != null) {
                authenticate(claims);
            }
        }
        chain.doFilter(request, response);
    }

    private void authenticate(StoreTokenClaims claims) {
        Long storeCompanyId = CurrentStore.require().companyId();
        // Un token de la tienda A no sirve en la B, aunque la firma sea válida.
        if (!storeCompanyId.equals(claims.companyId())) {
            return;
        }
        accountRepository.findWithCustomer(claims.accountId(), storeCompanyId)
                .filter(account -> account.getCustomer().isActive())
                .filter(account -> !issuedBeforePasswordChange(account, claims.issuedAt()))
                .ifPresent(account -> SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(
                                new StoreCustomer(account.getId(), account.getCustomer().getId(), storeCompanyId),
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_STORE_CUSTOMER")))));
    }

    // El token guarda segundos: se compara contra el cambio truncado, como en el ERP.
    private static boolean issuedBeforePasswordChange(StoreAccount account, Instant issuedAt) {
        Instant changedAt = account.getPasswordChangedAt();
        return changedAt != null && issuedAt.isBefore(changedAt.truncatedTo(ChronoUnit.SECONDS));
    }
}
