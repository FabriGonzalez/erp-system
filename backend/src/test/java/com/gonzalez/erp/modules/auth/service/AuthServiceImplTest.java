package com.gonzalez.erp.modules.auth.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.config.security.JwtUtil;
import com.gonzalez.erp.config.security.LoginAttemptService;
import com.gonzalez.erp.modules.auth.dto.request.ChangePasswordRequest;
import com.gonzalez.erp.modules.auth.dto.request.LoginRequest;
import com.gonzalez.erp.modules.auth.dto.response.TokenResponse;
import com.gonzalez.erp.modules.auth.exception.InvalidPasswordChangeException;
import com.gonzalez.erp.modules.auth.exception.TooManyLoginAttemptsException;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.entity.CompanyStatus;
import com.gonzalez.erp.modules.companies.exception.CompanyNotActiveException;
import com.gonzalez.erp.modules.users.entity.User;
import com.gonzalez.erp.modules.users.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    private static final String IP = "10.0.0.1";

    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtUtil jwtUtil;
    @Mock private LoginAttemptService loginAttemptService;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private AuthServiceImpl authService;

    private Company company;
    private User user;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(1L);
        user = User.builder()
                .username("vendedor")
                .email("vendedor@acme.com")
                .password("hash-actual")
                .firstName("Ven")
                .lastName("Dedor")
                .company(company)
                .build();
        user.setId(5L);
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void badCredentialsCountAsFailedAttempt() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(new LoginRequest("vendedor", "mala"), IP))
                .isInstanceOf(BadCredentialsException.class);
        verify(loginAttemptService).recordFailure("vendedor", IP);
        verify(loginAttemptService, never()).recordSuccess(any());
    }

    @Test
    void blockedUserIsRejectedBeforeCheckingPassword() {
        doThrow(new TooManyLoginAttemptsException(60)).when(loginAttemptService).checkAllowed("vendedor", IP);

        assertThatThrownBy(() -> authService.login(new LoginRequest("vendedor", "correcta"), IP))
                .isInstanceOf(TooManyLoginAttemptsException.class);
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void suspendedCompanyCannotLoginEvenWithValidCredentials() {
        company.suspend("Falta de pago");
        CustomUserDetails details = new CustomUserDetails(user);
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));

        assertThatThrownBy(() -> authService.login(new LoginRequest("vendedor", "correcta"), IP))
                .isInstanceOfSatisfying(CompanyNotActiveException.class,
                        e -> assertThat(e.getCode()).isEqualTo("COMPANY_" + CompanyStatus.SUSPENDED));
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void wrongCurrentPasswordIsRejectedAndCounted() {
        authenticate(user);
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("mala", "hash-actual")).thenReturn(false);

        assertThatThrownBy(() -> authService.changePassword(changeRequest("mala", "Nueva1234"), IP))
                .isInstanceOf(InvalidPasswordChangeException.class);
        verify(loginAttemptService).recordFailure("vendedor", IP);
        assertThat(user.getPassword()).isEqualTo("hash-actual");
    }

    @Test
    void newPasswordMustDifferFromCurrent() {
        authenticate(user);
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Actual123", "hash-actual")).thenReturn(true);

        assertThatThrownBy(() -> authService.changePassword(changeRequest("Actual123", "Actual123"), IP))
                .isInstanceOfSatisfying(InvalidPasswordChangeException.class,
                        e -> assertThat(e.getCode()).isEqualTo("PASSWORD_UNCHANGED"));
        assertThat(user.getPasswordChangedAt()).isNull();
    }

    @Test
    void changePasswordUpdatesHashRevokesOldTokensAndReturnsNewToken() {
        authenticate(user);
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Actual123", "hash-actual")).thenReturn(true);
        when(passwordEncoder.matches("Nueva1234", "hash-actual")).thenReturn(false);
        when(passwordEncoder.encode("Nueva1234")).thenReturn("hash-nuevo");
        when(jwtUtil.generateToken(any())).thenReturn("token-nuevo");

        TokenResponse response = authService.changePassword(changeRequest("Actual123", "Nueva1234"), IP);

        assertThat(response.token()).isEqualTo("token-nuevo");
        assertThat(user.getPassword()).isEqualTo("hash-nuevo");
        assertThat(user.getPasswordChangedAt()).isNotNull();
        verify(loginAttemptService).recordSuccess("vendedor");
    }

    private ChangePasswordRequest changeRequest(String current, String next) {
        return new ChangePasswordRequest(current, next, next);
    }

    private void authenticate(User user) {
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
