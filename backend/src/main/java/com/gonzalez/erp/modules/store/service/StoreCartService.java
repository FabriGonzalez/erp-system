package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.store.dto.StoreCartQuoteResponse;
import com.gonzalez.erp.modules.store.dto.StoreCartRequest;

public interface StoreCartService {
    StoreCartQuoteResponse quote(StoreCartRequest request);

    /** La misma evaluación que la cotización, con las entidades para el checkout. */
    StoreCartEvaluation evaluate(Company company, StoreCartRequest request);
}
