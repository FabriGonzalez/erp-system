package com.gonzalez.erp.modules.companies.exception;

import com.gonzalez.erp.modules.companies.entity.CompanyStatus;
import lombok.Getter;

/** El usuario se autenticó bien, pero su empresa no puede operar. */
@Getter
public class CompanyNotActiveException extends RuntimeException {

    private final CompanyStatus status;

    public CompanyNotActiveException(CompanyStatus status) {
        super("Company is " + status.name().toLowerCase());
        this.status = status;
    }

    /** Código estable para que el frontend distinga el motivo. */
    public String getCode() {
        return "COMPANY_" + status.name();
    }
}
