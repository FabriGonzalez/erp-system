package com.gonzalez.erp.modules.customers.service;

import com.gonzalez.erp.common.dto.PageResponse;
import com.gonzalez.erp.modules.customers.dto.response.CustomerAccountSummaryResponse;
import com.gonzalez.erp.modules.customers.dto.response.CustomerDebtorResponse;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;

public interface CustomerBalanceService {

    CustomerAccountSummaryResponse getSummary(Long customerId);

    PageResponse<CustomerDebtorResponse> findDebtors(String query, Pageable pageable);

    /**
     * Saldo a favor disponible: dinero pagado (y no reembolsado) que todavía
     * no está asignado a ninguna orden.
     */
    BigDecimal getAvailableCredit(Long customerId, Long companyId);
}
