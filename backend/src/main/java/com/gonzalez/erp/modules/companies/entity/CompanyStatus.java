package com.gonzalez.erp.modules.companies.entity;

/**
 * Estado comercial de una empresa. Solo ACTIVE permite operar: SUSPENDED es reversible
 * (p. ej. falta de pago) y CANCELLED es definitivo.
 */
public enum CompanyStatus {
    ACTIVE,
    SUSPENDED,
    CANCELLED
}
