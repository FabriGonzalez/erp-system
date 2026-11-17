package com.gonzalez.erp.modules.companies.exception;

public class StoreDomainAlreadyExistsException extends RuntimeException {

    public StoreDomainAlreadyExistsException(String storeDomain) {
        super("Another company already uses the store domain: " + storeDomain);
    }
}
