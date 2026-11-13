package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.common.exception.ResourceNotFoundException;
import com.gonzalez.erp.config.security.LoginAttemptService;
import com.gonzalez.erp.modules.auth.exception.InvalidPasswordChangeException;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.customers.entity.Customer;
import com.gonzalez.erp.modules.customers.entity.CustomerOrigin;
import com.gonzalez.erp.modules.customers.repository.CustomerRepository;
import com.gonzalez.erp.modules.customers.service.CustomerAccountService;
import com.gonzalez.erp.modules.store.dto.StoreChangePasswordRequest;
import com.gonzalez.erp.modules.store.dto.StoreLoginRequest;
import com.gonzalez.erp.modules.store.dto.StoreMeResponse;
import com.gonzalez.erp.modules.store.dto.StoreRegisterRequest;
import com.gonzalez.erp.modules.store.dto.StoreResetPasswordRequest;
import com.gonzalez.erp.modules.store.dto.StoreTokenResponse;
import com.gonzalez.erp.modules.store.dto.StoreUpdateProfileRequest;
import com.gonzalez.erp.modules.store.entity.StoreAccount;
import com.gonzalez.erp.modules.store.entity.StoreAccountToken;
import com.gonzalez.erp.modules.store.entity.StoreAccountTokenType;
import com.gonzalez.erp.modules.store.entity.StorePendingRegistration;
import com.gonzalez.erp.modules.store.exception.StoreAuthException;
import com.gonzalez.erp.modules.store.mail.StoreMailEvent;
import com.gonzalez.erp.modules.store.repository.StoreAccountRepository;
import com.gonzalez.erp.modules.store.repository.StoreAccountTokenRepository;
import com.gonzalez.erp.modules.store.repository.StorePendingRegistrationRepository;
import com.gonzalez.erp.modules.store.security.GoogleTokenVerifier;
import com.gonzalez.erp.modules.store.security.GoogleTokenVerifier.GoogleIdentity;
import com.gonzalez.erp.modules.store.security.StoreCustomer;
import com.gonzalez.erp.modules.store.security.StoreLinkTokens;
import com.gonzalez.erp.modules.store.security.StoreTokenService;
import com.gonzalez.erp.modules.store.web.CurrentStore;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class StoreAuthServiceImpl implements StoreAuthService {

    static final Duration VERIFICATION_TTL = Duration.ofHours(48);
    static final Duration PASSWORD_RESET_TTL = Duration.ofHours(1);

    private final StoreAccountRepository accountRepository;
    private final StorePendingRegistrationRepository pendingRepository;
    private final StoreAccountTokenRepository accountTokenRepository;
    private final CustomerRepository customerRepository;
    private final CustomerAccountService customerAccountService;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final StoreTokenService tokenService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final LoginAttemptService loginAttemptService;
    private final ApplicationEventPublisher events;

    // Hash de una contraseña que nadie conoce: con un email sin cuenta se compara contra él, así
    // el login tarda lo mismo exista o no la cuenta (no se puede averiguar midiendo el tiempo).
    private volatile String unknownAccountHash;

    @Override
    public void register(StoreRegisterRequest request, String clientIp) {
        CurrentStore store = CurrentStore.require();
        String email = normalizeEmail(request.email());
        throttle("store-register", store.companyId(), email, clientIp);
        // Se calcula siempre, antes de mirar si existe: el hash es lo lento y los dos caminos tardan igual.
        String passwordHash = passwordEncoder.encode(request.password());

        Optional<StoreAccount> existing = accountRepository.findWithCustomerByEmail(store.companyId(), email);
        if (existing.isPresent()) {
            // La respuesta es la misma; solo el dueño del email se entera, por mail.
            events.publishEvent(new StoreMailEvent.AlreadyRegistered(
                    email, firstNameOf(existing.get().getCustomer()), store.name(), store.domain(), store.mailFrom(),
                    existing.get().getPasswordHash() != null));
            return;
        }

        Instant now = Instant.now();
        pendingRepository.deleteExpiredByEmail(store.companyId(), email, now);
        StoreLinkTokens.IssuedToken link = StoreLinkTokens.issue();
        // No se toca ningún otro registro pendiente del email: cada link crea la cuenta con sus propios datos.
        pendingRepository.save(StorePendingRegistration.builder()
                .company(companyRepository.getReferenceById(store.companyId()))
                .email(email)
                .firstName(request.firstName().trim())
                .lastName(request.lastName().trim())
                .phone(blankToNull(request.phone()))
                .passwordHash(passwordHash)
                .tokenHash(link.hash())
                .expiresAt(now.plus(VERIFICATION_TTL))
                .build());
        events.publishEvent(new StoreMailEvent.Verification(
                email, request.firstName().trim(), store.name(), store.domain(), store.mailFrom(), link.token()));
    }

    @Override
    public void verifyEmail(String token) {
        Long companyId = CurrentStore.require().companyId();
        Instant now = Instant.now();
        StorePendingRegistration pending = pendingRepository
                .findByCompanyIdAndTokenHash(companyId, StoreLinkTokens.hash(token))
                .filter(registration -> !registration.isExpired(now))
                .orElseThrow(StoreAuthException::invalidLink);
        // Otro registro del mismo email ya se verificó: este link ya no crea nada.
        if (accountRepository.existsByCompanyIdAndEmail(companyId, pending.getEmail())) {
            throw StoreAuthException.invalidLink();
        }

        Company company = companyRepository.getReferenceById(companyId);
        // Siempre una ficha nueva: nunca se vincula con una del ERP, aunque coincida el email.
        Customer customer = customerRepository.save(Customer.builder()
                .firstName(pending.getFirstName())
                .lastName(pending.getLastName())
                .email(pending.getEmail())
                .phone(pending.getPhone())
                .company(company)
                .origin(CustomerOrigin.WEB)
                .build());
        // Como en el alta del ERP: sin cuenta corriente no se le puede cargar ni cobrar un pedido.
        customerAccountService.createAccount(customer);
        accountRepository.save(StoreAccount.builder()
                .company(company)
                .customer(customer)
                .email(pending.getEmail())
                .passwordHash(pending.getPasswordHash())
                .emailVerifiedAt(now)
                .build());
        // Los demás registros del email (propios repetidos o de otra persona) quedan anulados.
        pendingRepository.deleteAllByEmail(companyId, pending.getEmail());
    }

    @Override
    public void resendVerification(String rawEmail, String clientIp) {
        CurrentStore store = CurrentStore.require();
        String email = normalizeEmail(rawEmail);
        throttle("store-resend", store.companyId(), email, clientIp);
        if (accountRepository.existsByCompanyIdAndEmail(store.companyId(), email)) {
            return;
        }
        pendingRepository.findTop5ByCompanyIdAndEmailOrderByCreatedAtDesc(store.companyId(), email).stream()
                .findFirst()
                .ifPresent(pending -> {
                    StoreLinkTokens.IssuedToken link = StoreLinkTokens.issue();
                    pending.renewToken(link.hash(), Instant.now().plus(VERIFICATION_TTL));
                    events.publishEvent(new StoreMailEvent.Verification(
                            email, pending.getFirstName(), store.name(), store.domain(), store.mailFrom(), link.token()));
                });
    }

    @Override
    public StoreTokenResponse login(StoreLoginRequest request, String clientIp) {
        Long companyId = CurrentStore.require().companyId();
        String email = normalizeEmail(request.email());
        String attemptKey = loginAttemptKey(companyId, email);
        loginAttemptService.checkAllowed(attemptKey, clientIp);

        Optional<StoreAccount> found = accountRepository.findWithCustomerByEmail(companyId, email);
        if (found.isEmpty()) {
            // Recién acá se avisa que falta verificar, y solo con la contraseña correcta:
            // sin ella no se puede saber si hay un registro pendiente.
            if (matchesPendingRegistration(companyId, email, request.password())) {
                throw StoreAuthException.emailNotVerified();
            }
            loginAttemptService.recordFailure(attemptKey, clientIp);
            throw new BadCredentialsException("Invalid email or password");
        }

        StoreAccount account = found.get();
        String passwordHash = account.getPasswordHash();
        // Sin contraseña (cuenta de Google) se compara igual, para que tarde lo mismo que las demás.
        boolean passwordMatches = passwordEncoder.matches(
                request.password(), passwordHash != null ? passwordHash : unknownAccountHash()) && passwordHash != null;
        // Ficha desactivada en el ERP: el mismo error, sin revelar que la cuenta existe.
        if (!passwordMatches || !account.getCustomer().isActive()) {
            loginAttemptService.recordFailure(attemptKey, clientIp);
            throw new BadCredentialsException("Invalid email or password");
        }
        loginAttemptService.recordSuccess(attemptKey);

        account.recordLogin(Instant.now());
        return StoreTokenResponse.bearer(tokenService.generate(account));
    }

    @Override
    public StoreTokenResponse loginWithGoogle(String idToken) {
        Long companyId = CurrentStore.require().companyId();
        GoogleIdentity google = googleTokenVerifier.verify(idToken);

        // El id de Google es lo que identifica a la persona: si ya está vinculada, el email no importa.
        StoreAccount account = accountRepository.findWithCustomerByGoogleSubject(companyId, google.subject())
                .orElseGet(() -> linkOrCreateGoogleAccount(companyId, google));
        // Al fallar se revierte la transacción: una ficha desactivada tampoco queda vinculada.
        if (!account.getCustomer().isActive()) {
            throw StoreAuthException.googleLoginFailed();
        }
        account.recordLogin(Instant.now());
        return StoreTokenResponse.bearer(tokenService.generate(account));
    }

    private StoreAccount linkOrCreateGoogleAccount(Long companyId, GoogleIdentity google) {
        if (!google.emailVerified()) {
            throw StoreAuthException.googleLoginFailed();
        }
        String email = normalizeEmail(google.email());
        Instant now = Instant.now();

        Optional<StoreAccount> byEmail = accountRepository.findWithCustomerByEmail(companyId, email);
        if (byEmail.isPresent()) {
            StoreAccount account = byEmail.get();
            // El email pasó a otra persona (p. ej. una casilla corporativa reasignada): no hereda la cuenta.
            if (account.getGoogleSubject() != null) {
                throw StoreAuthException.googleLoginFailed();
            }
            account.linkGoogle(google.subject(), now);
            return account;
        }

        Company company = companyRepository.getReferenceById(companyId);
        // Siempre una ficha nueva, como el registro. Sin nombre en Google, lo completa el comprador en su perfil.
        Customer customer = customerRepository.save(Customer.builder()
                .firstName(googleName(google.givenName()))
                .lastName(googleName(google.familyName()))
                .email(email)
                .company(company)
                .origin(CustomerOrigin.WEB)
                .build());
        customerAccountService.createAccount(customer);
        StoreAccount account = accountRepository.save(StoreAccount.builder()
                .company(company)
                .customer(customer)
                .email(email)
                .googleSubject(google.subject())
                .emailVerifiedAt(now)
                .build());
        // Los links de registro pendientes de este email ya no tienen nada que crear.
        pendingRepository.deleteAllByEmail(companyId, email);
        return account;
    }

    // Un nombre demasiado largo no puede impedir la entrada: la columna admite 100 caracteres.
    private static String googleName(String name) {
        String value = blankToNull(name);
        return value == null || value.length() <= 100 ? value : value.substring(0, 100);
    }

    @Override
    public void forgotPassword(String rawEmail, String clientIp) {
        CurrentStore store = CurrentStore.require();
        String email = normalizeEmail(rawEmail);
        throttle("store-forgot", store.companyId(), email, clientIp);

        Optional<StoreAccount> found = accountRepository.findWithCustomerByEmail(store.companyId(), email);
        // Sin cuenta (o solo con un registro sin verificar), con la ficha desactivada o creada con
        // Google (sin contraseña que restablecer): no se manda nada y la respuesta es la misma.
        if (found.isEmpty() || !found.get().getCustomer().isActive() || found.get().getPasswordHash() == null) {
            return;
        }
        StoreAccount account = found.get();
        Instant now = Instant.now();
        accountTokenRepository.invalidatePending(account.getId(), StoreAccountTokenType.PASSWORD_RESET, now);
        StoreLinkTokens.IssuedToken link = StoreLinkTokens.issue();
        accountTokenRepository.save(StoreAccountToken.builder()
                .account(account)
                .type(StoreAccountTokenType.PASSWORD_RESET)
                .tokenHash(link.hash())
                .expiresAt(now.plus(PASSWORD_RESET_TTL))
                .build());
        events.publishEvent(new StoreMailEvent.PasswordReset(
                email, firstNameOf(account.getCustomer()), store.name(), store.domain(), store.mailFrom(), link.token()));
    }

    @Override
    public void resetPassword(StoreResetPasswordRequest request) {
        CurrentStore store = CurrentStore.require();
        Instant now = Instant.now();
        StoreAccountToken link = accountTokenRepository
                .findWithAccount(store.companyId(), StoreLinkTokens.hash(request.token()),
                        StoreAccountTokenType.PASSWORD_RESET)
                .filter(token -> token.isUsable(now))
                .filter(token -> token.getAccount().getCustomer().isActive())
                .orElseThrow(StoreAuthException::invalidLink);

        StoreAccount account = link.getAccount();
        link.markUsed(now);
        // Cambiar la contraseña cierra las sesiones abiertas: el filtro rechaza los tokens anteriores.
        account.changePassword(passwordEncoder.encode(request.password()), now);
        // Quien recuperó la contraseña no tiene que esperar el bloqueo por los intentos fallidos.
        loginAttemptService.recordSuccess(loginAttemptKey(store.companyId(), account.getEmail()));
        events.publishEvent(new StoreMailEvent.PasswordChanged(
                account.getEmail(), firstNameOf(account.getCustomer()), store.name(), store.domain(), store.mailFrom()));
    }

    @Override
    @Transactional(readOnly = true)
    public StoreMeResponse me() {
        return toMeResponse(currentAccount());
    }

    @Override
    public StoreMeResponse updateProfile(StoreUpdateProfileRequest request) {
        StoreAccount account = currentAccount();
        account.getCustomer().updateContact(
                request.firstName().trim(), request.lastName().trim(), blankToNull(request.phone()));
        return toMeResponse(account);
    }

    @Override
    public StoreTokenResponse changePassword(StoreChangePasswordRequest request, String clientIp) {
        CurrentStore store = CurrentStore.require();
        StoreAccount account = currentAccount();
        String attemptKey = loginAttemptKey(store.companyId(), account.getEmail());
        // Adivinar la contraseña actual con una sesión robada cuenta como intento fallido.
        loginAttemptService.checkAllowed(attemptKey, clientIp);

        if (account.getPasswordHash() == null) {
            throw InvalidPasswordChangeException.passwordNotSet();
        }
        if (!passwordEncoder.matches(request.currentPassword(), account.getPasswordHash())) {
            loginAttemptService.recordFailure(attemptKey, clientIp);
            throw InvalidPasswordChangeException.wrongCurrentPassword();
        }
        if (passwordEncoder.matches(request.newPassword(), account.getPasswordHash())) {
            throw InvalidPasswordChangeException.sameAsCurrent();
        }

        account.changePassword(passwordEncoder.encode(request.newPassword()), Instant.now());
        loginAttemptService.recordSuccess(attemptKey);
        events.publishEvent(new StoreMailEvent.PasswordChanged(
                account.getEmail(), firstNameOf(account.getCustomer()), store.name(), store.domain(), store.mailFrom()));
        // Se firma después del cambio: el filtro rechaza los anteriores y este sigue valiendo.
        return StoreTokenResponse.bearer(tokenService.generate(account));
    }

    private StoreAccount currentAccount() {
        StoreCustomer current = StoreCustomer.require();
        return accountRepository.findWithCustomer(current.accountId(), current.companyId())
                .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }

    private static StoreMeResponse toMeResponse(StoreAccount account) {
        Customer customer = account.getCustomer();
        return new StoreMeResponse(
                customer.getFirstName(),
                customer.getLastName(),
                account.getEmail(),
                customer.getPhone(),
                account.isEmailVerified(),
                account.getPasswordHash() != null
        );
    }

    private boolean matchesPendingRegistration(Long companyId, String email, String password) {
        List<StorePendingRegistration> pending =
                pendingRepository.findTop5ByCompanyIdAndEmailOrderByCreatedAtDesc(companyId, email);
        if (pending.isEmpty()) {
            passwordEncoder.matches(password, unknownAccountHash());
            return false;
        }
        // Un vencido también cuenta: el sitio ofrece reenviar y el reenvío renueva el link.
        return pending.stream().anyMatch(registration -> passwordEncoder.matches(password, registration.getPasswordHash()));
    }

    // La empresa en la clave: el mismo email en otra tienda es otra cuenta, con su propio contador.
    private static String loginAttemptKey(Long companyId, String email) {
        return "store:" + companyId + ":" + email;
    }

    /**
     * Registro, reenvío y recuperación mandan mails: cada pedido cuenta como un intento (5 por email y 30 por IP
     * cada 15 minutos), para que nadie llene la casilla de otro. La IP lleva la acción en la clave
     * para no mezclar estos pedidos con los fallos de login.
     */
    private void throttle(String action, Long companyId, String email, String clientIp) {
        String key = action + ":" + companyId + ":" + email;
        String ipKey = action + ":" + clientIp;
        loginAttemptService.checkAllowed(key, ipKey);
        loginAttemptService.recordFailure(key, ipKey);
    }

    private String unknownAccountHash() {
        if (unknownAccountHash == null) {
            unknownAccountHash = passwordEncoder.encode("unknown-account-" + Instant.now());
        }
        return unknownAccountHash;
    }

    private static String firstNameOf(Customer customer) {
        return Objects.requireNonNullElse(customer.getFirstName(), "");
    }

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
