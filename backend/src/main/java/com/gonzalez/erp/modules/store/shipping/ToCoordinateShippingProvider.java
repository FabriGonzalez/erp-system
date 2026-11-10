package com.gonzalez.erp.modules.store.shipping;

import com.gonzalez.erp.modules.branches.entity.Branch;
import com.gonzalez.erp.modules.companies.entity.Company;
import com.gonzalez.erp.modules.customers.entity.Address;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * Envío "a coordinar": no se cobra en la web y la tienda arregla el costo con el comprador.
 * Provisorio: antes de habilitar una tienda hay que reemplazarlo por un provider real.
 */
@Component
public class ToCoordinateShippingProvider implements ShippingProvider {

    @Override
    public BigDecimal cost(Company company, Branch origin, Address destination) {
        return BigDecimal.ZERO;
    }
}
