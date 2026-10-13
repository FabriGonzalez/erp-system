package com.gonzalez.erp.modules.companies.exception;

import com.gonzalez.erp.modules.companies.entity.CompanyStatus;

public class InvalidCompanyStatusTransitionException extends RuntimeException {
    public InvalidCompanyStatusTransitionException(CompanyStatus from, CompanyStatus to) {
        super("Company cannot change status from %s to %s".formatted(from, to));
    }
}
