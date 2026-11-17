package com.gonzalez.erp.modules.companies.service;

import com.gonzalez.erp.config.security.CustomUserDetails;
import com.gonzalez.erp.modules.companies.dto.request.StoreSettingsRequest;
import com.gonzalez.erp.modules.companies.dto.response.StoreSettingsResponse;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.companies.repository.CompanyRepository;
import com.gonzalez.erp.modules.roles.entity.Permission;
import com.gonzalez.erp.modules.roles.entity.Role;
import com.gonzalez.erp.modules.users.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyStoreServiceImplTest {

    private static final Long COMPANY_ID = 1L;

    @Mock private CompanyRepository companyRepository;

    @InjectMocks private CompanyStoreServiceImpl companyStoreService;

    private Company company;

    @BeforeEach
    void setUp() {
        company = Company.builder().name("Acme").build();
        company.setId(COMPANY_ID);
        login();
        when(companyRepository.findById(COMPANY_ID)).thenReturn(Optional.of(company));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void newCompanyHasTheStoreDisabledWithoutAdjustmentAndRoundingToTen() {
        StoreSettingsResponse response = companyStoreService.getSettings();

        assertThat(response.storeDomain()).isNull();
        assertThat(response.storeEnabled()).isFalse();
        assertThat(response.priceAdjustmentPercent()).isEqualByComparingTo("0");
        assertThat(response.roundingStep()).isEqualTo(10);
    }

    @Test
    void updatesAdjustmentAndRoundingOfTheCurrentCompany() {
        StoreSettingsResponse response = companyStoreService.updateSettings(
                new StoreSettingsRequest(new BigDecimal("-5.5"), 100));

        assertThat(response.priceAdjustmentPercent()).isEqualByComparingTo("-5.5");
        assertThat(response.roundingStep()).isEqualTo(100);
        assertThat(company.getStorePriceAdjustmentPercent()).isEqualByComparingTo("-5.5");
        assertThat(company.getStoreRoundingStep()).isEqualTo(100);
    }

    @Test
    void updatingDoesNotTouchDomainNorEnabled() {
        companyStoreService.updateSettings(new StoreSettingsRequest(BigDecimal.TEN, 10));

        assertThat(company.getStoreDomain()).isNull();
        assertThat(company.isStoreEnabled()).isFalse();
    }

    private void login() {
        Role role = Role.builder()
                .name("Rol")
                .code("ROL")
                .company(company)
                .permissions(EnumSet.of(Permission.ADMINISTRAR_TIENDA))
                .build();
        User user = User.builder()
                .username("admin")
                .email("admin@acme.com")
                .password("x")
                .company(company)
                .role(role)
                .build();
        user.setId(7L);
        CustomUserDetails details = new CustomUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
