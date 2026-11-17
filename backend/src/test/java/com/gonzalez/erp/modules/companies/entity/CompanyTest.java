package com.gonzalez.erp.modules.companies.entity;

import com.gonzalez.erp.modules.companies.exception.InvalidCompanyStatusTransitionException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CompanyTest {

    @Test
    void newCompanyIsActive() {
        Company company = Company.builder().name("Acme").build();

        assertThat(company.getStatus()).isEqualTo(CompanyStatus.ACTIVE);
        assertThat(company.isActive()).isTrue();
    }

    @Test
    void suspendRecordsReasonAndDateAndReactivateClearsReason() {
        Company company = Company.builder().name("Acme").build();

        company.suspend("Falta de pago");

        assertThat(company.getStatus()).isEqualTo(CompanyStatus.SUSPENDED);
        assertThat(company.getStatusReason()).isEqualTo("Falta de pago");
        assertThat(company.getStatusChangedAt()).isNotNull();

        company.reactivate();

        assertThat(company.isActive()).isTrue();
        assertThat(company.getStatusReason()).isNull();
    }

    @Test
    void cancelledIsFinal() {
        Company company = Company.builder().name("Acme").build();
        company.cancel("Baja del servicio");

        assertThatThrownBy(company::reactivate).isInstanceOf(InvalidCompanyStatusTransitionException.class);
        assertThatThrownBy(() -> company.suspend("x")).isInstanceOf(InvalidCompanyStatusTransitionException.class);
        assertThat(company.getStatus()).isEqualTo(CompanyStatus.CANCELLED);
    }

    @Test
    void cannotReactivateActiveCompany() {
        Company company = Company.builder().name("Acme").build();

        assertThatThrownBy(company::reactivate).isInstanceOf(InvalidCompanyStatusTransitionException.class);
    }
}
