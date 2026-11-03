package com.gonzalez.erp.modules.store.service;

import com.gonzalez.erp.modules.companies.entity.Company;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Única función del precio web: la usan el catálogo público y el checkout. El precio web no se
 * guarda; el pedido guarda lo que se cobró, así cambiar el ajuste no altera pedidos viejos.
 */
public final class StorePrices {

    private StorePrices() {}

    public static BigDecimal webPrice(BigDecimal erpPrice, Company company) {
        return webPrice(erpPrice, company.getStorePriceAdjustmentPercent(), company.getStoreRoundingStep());
    }

    /** Precio ERP con el ajuste porcentual, redondeado hacia arriba al múltiplo del paso. */
    public static BigDecimal webPrice(BigDecimal erpPrice, BigDecimal adjustmentPercent, int roundingStep) {
        // Multiplicar antes de dividir por 100 deja la cuenta exacta (sin redondeos intermedios).
        BigDecimal adjusted = erpPrice
                .multiply(BigDecimal.valueOf(100).add(adjustmentPercent))
                .movePointLeft(2);
        BigDecimal step = BigDecimal.valueOf(roundingStep);
        return adjusted.divide(step, 0, RoundingMode.CEILING)
                .multiply(step)
                .setScale(2, RoundingMode.UNNECESSARY);
    }
}
