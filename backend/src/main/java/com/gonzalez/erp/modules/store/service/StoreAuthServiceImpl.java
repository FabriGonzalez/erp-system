package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.LoginAttemptService;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.CustomerOrigin;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.store.dto.StoreLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreMeResponse;
import com.gonzalez.erp.modules.store.dto.StoreRegisterRequest;
import com.gonzalez.erp.modules.store.dto.StoreTokenResponse;
import com.gonzalez.erp.modules.store.entity.StoreAccount;
import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.security.StoreCustomer;
import com.gonzalez.erp.modules.store.security.StoreTokenService;
import com.gonzalez.erp.modules.store.web.CurrentStore;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class StoreAuthServiceImpl implements StoreAuthService {

    private final StoreAccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final StoreTokenService tokenService;
    private final LoginAttemptService loginAttemptService;

    // Hash de una contraseña que nadie conoce: con un email sin cuenta se compara contra él, así
    // el login tarda lo mismo exista o no la cuenta (no se puede averiguar midiendo el tiempo).
    private volatile String unknownAccountHash;

    @Override
    public void register(StoreRegisterRequest request) {
        Long companyId = CurrentStore.require().companyId();
        String email = normalizeEmail(request.email());
        // Se calcula siempre, antes de mirar si existe: el hash es lo lento y los dos caminos tardan igual.
        String passwordHash = passwordEncoder.encode(request.password());

        if (accountRepository.existsByCompanyIdAndEmail(companyId, email)) {
            // El paso 3 (mails) le avisa al dueño "ya tenés cuenta". Acá no se dice nada.
            return;
        }

        Company company = companyRepository.getReferenceById(companyId);
        // Siempre una ficha nueva: nunca se vincula con una del ERP, aunque coincida el email.
        Customer customer = customerRepository.save(Customer.builder()
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .email(email)
                .phone(blankToNull(request.phone()))
                .company(company)
                .origin(CustomerOrigin.WEB)
                .build());
        accountRepository.save(StoreAccount.builder()
                .company(company)
                .customer(customer)
                .email(email)
                .passwordHash(passwordHash)
                .build());
    }

    @Override
    public StoreTokenResponse login(StoreLoginRequest request, String clientIp) {
        Long companyId = CurrentStore.require().companyId();
        String email = normalizeEmail(request.email());
        // La empresa en la clave: el mismo email en otra tienda es otra cuenta, con su propio contador.
        String attemptKey = "store:" + companyId + ":" + email;
        loginAttemptService.checkAllowed(attemptKey, clientIp);

        Optional<StoreAccount> found = accountRepository.findWithCustomerByEmail(companyId, email);
        boolean passwordMatches = found
                .filter(account -> account.getPasswordHash() != null)
                .map(account -> passwordEncoder.matches(request.password(), account.getPasswordHash()))
                .orElseGet(() -> {
                    passwordEncoder.matches(request.password(), unknownAccountHash());
                    return false;
                });
        // Ficha desactivada en el ERP: el mismo error, sin revelar que la cuenta existe.
        if (!passwordMatches || !found.get().getCustomer().isActive()) {
            loginAttemptService.recordFailure(attemptKey, clientIp);
            throw new BadCredentialsException("Invalid email or password");
        }
        loginAttemptService.recordSuccess(attemptKey);

        StoreAccount account = found.get();
        account.recordLogin(Instant.now());
        return StoreTokenResponse.bearer(tokenService.generate(account));
    }

    @Override
    @Transactional(readOnly = true)
    public StoreMeResponse me() {
        StoreCustomer current = StoreCustomer.require();
        StoreAccount account = accountRepository.findWithCustomer(current.accountId(), current.companyId())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
        Customer customer = account.getCustomer();
        return new StoreMeResponse(
                customer.getFirstName(),
                customer.getLastName(),
                account.getEmail(),
                customer.getPhone(),
                account.isEmailVerified()
        );
    }

    private String unknownAccountHash() {
        if (unknownAccountHash == null) {
            unknownAccountHash = passwordEncoder.encode("unknown-account-" + Instant.now());
        }
        return unknownAccountHash;
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
